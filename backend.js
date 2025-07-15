// Browser können nicht mehr Informationen über das Netzwerk bereitstellen, deswegen Identifikation nur über IP Adresse
// Das wird aber dann zum Beispiel in Uni Netzwerken nicht funktionieren -> Doch jetzt mit ipv6 schon
// Später dann wenn native Apps benutzt werden können die Clients mehr Informationen über das Netzwerk bereitstellen und dadurch kann das backend einzelne Netzwerke richtig identifizieren (oder es funktioniert jetzt mit IPv6)
// Für eine bessere Datenstruktur sagt AI eine Room Klasse benutzen. Für den Anfang reicht aber das denke ich

const WebSocket = require("ws");
const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const db = require("./database");
const dashboardRoutes = require("./dashboard");

// Add near the top of your file
const PING_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 60000; // 60 seconds

// Initialize the database
db.initDatabase().catch(err =>
  console.error("Database initialization failed:", err)
);

// Create views directory if it doesn't exist
// const viewsDir = path.join(__dirname, "views");
// if (!fs.existsSync(viewsDir)) {
//   fs.mkdirSync(viewsDir);
// }

// Create Express app for dashboard
const app = express();
app.use(express.static(path.join(__dirname, "public")));

// Share db with routes
app.set("db", db);

// Use dashboard routes
app.use("/dashboard", dashboardRoutes);
app.use("/stats", dashboardRoutes); // For backward compatibility if needed

// Create HTTP server and attach both Express and WebSocket
const server = http.createServer(app);

// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({
  server,
  // Remove host and ipv6Only for dual-stack support
});

// id to websocket map
const clients = new Map();

// room id to client id set map
const rooms = new Map(); // Store room information

// After creating the WebSocket server
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      console.log(`Client timed out, terminating connection`);
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, PING_INTERVAL);

const broadcastNewClient = newClientId => {
  // Get new client's network
  const newClient = clients.get(newClientId);
  if (!newClient) return;

  const networkId = newClient.networkId;
  if (!networkId) return;

  // Get the new client and their network
  const newUsername = newClient?.username || "Anonymous";

  // To all clients in the same network
  if (networkId && rooms.has(networkId)) {
    rooms.get(networkId).forEach(clientId => {
      if (clientId !== newClientId) {
        clients.get(clientId).send(
          JSON.stringify({
            type: "new-client",
            id: newClientId,
            username: newUsername, // Include the username of the new client
            avatarNr: newClient.avatarNr,
          })
        );
      }
    });
  }
};

const broadcastExistingClients = newClientId => {
  // Get new client's network
  const newClient = clients.get(newClientId);
  if (!newClient) return;

  const networkId = newClient.networkId;
  if (!networkId) return;

  // Only get clients from the specific room
  const existingClients = Array.from(rooms.get(networkId))
    .filter(clientId => clientId !== newClientId)
    .map(clientId => {
      const ws = clients.get(clientId);
      return {
        id: clientId,
        username: ws.username || "Anonymous",
        avatarNr: ws.avatarNr,
      };
    });

  // Send to new client
  if (clients.has(newClientId)) {
    clients.get(newClientId).send(
      JSON.stringify({
        type: "existing-clients",
        peers: existingClients,
      })
    );
    console.log(
      `Sent ${existingClients.length} existing peers to ${newClientId} in network ${networkId}`
    );
  }
};

// Helper function to broadcast client disconnect to all clients
const broadcastClientDisconnect = disconnectedClientId => {
  const disconnectedClient = clients.get(disconnectedClientId);
  if (!disconnectedClient) return;

  const networkId = disconnectedClient.networkId;
  if (!networkId) return;

  // Broadcast to all clients in the same network
  rooms.get(networkId).forEach(clientId => {
    if (clientId !== disconnectedClientId) {
      clients.get(clientId).send(
        JSON.stringify({
          type: "client-disconnect",
          id: disconnectedClientId,
        })
      );
    }
  });

  // Only broadcast to clients in same network
  // clients.forEach((client, clientId) => {
  //   if (clientId !== disconnectedClientId && client.networkId === networkId) {
  //     client.send(
  //       JSON.stringify({
  //         type: "client-disconnect",
  //         id: disconnectedClientId,
  //         networkId: networkId
  //       })
  //     );
  //   }
  // });

  console.log(
    `Broadcasted disconnect of client ${disconnectedClientId} to network ${networkId}`
  );
};

// Add IP handling functions
const getClientIPs = req => {
  const rawIP = req.socket.remoteAddress;
  const forwardedIP = req.headers["x-forwarded-for"]?.split(",")[0];

  let ipv6 = null;
  let ipv4 = null;

  // Handle both IPv4 and IPv6
  if (rawIP && rawIP.includes(":")) {
    ipv6 = rawIP;
  } else if (rawIP && rawIP.includes(".")) {
    ipv4 = rawIP;
  }

  return { ipv6, ipv4, forwardedIP };
};

// Add network utilities at top of file
const getNetworkId = ip => {
  if (!ip) return null;

  // For IPv6
  if (ip.includes(":")) {
    // Get first four segments for /64 subnet
    return ip.split(":").slice(0, 4).join(":");
  }

  // For IPv4
  if (ip.includes(".")) {
    // Get first three octets for /24 subnet (class C network)
    const parts = ip.split(".");
    if (parts.length === 4) {
      return parts.slice(0, 3).join(".");
    }
  }

  return null;
};

// Clean up on server close
wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

wss.on("connection", (ws, req) => {
  // Log all possible IP sources with explanations
  //console.log('IP Detection Sources:');
  //console.log('x-real-ip:', req.headers['x-real-ip']);          // Original client IP (set by nginx/proxy)
  //console.log('x-forwarded-for:', req.headers['x-forwarded-for']); // Chain of proxy IPs
  // console.log('raw x-forwarded-for split:', req.headers['x-forwarded-for']?.split(',').map(ip => ip.trim())); // All IPs in chain
  //console.log('socket remoteAddress:', req.socket.remoteAddress);  // Direct connection IP
  //console.log('socket localAddress:', req.socket.localAddress);    // Server's local interface IP

  // Set initial alive state
  ws.isAlive = true;

  // Handle pongs
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  // The priority order for getting the most accurate client IP:
  const clientIP =
    req.headers["x-real-ip"] || // 1. Trust nginx's x-real-ip
    req.headers["x-forwarded-for"]?.split(",")[0].trim() || // 2. First IP in forwarding chain
    req.socket.remoteAddress; // 3. Fallback to direct connection

  // Assign a unique ID to the connected client
  const id = Math.random().toString(36).substring(7);
  clients.set(id, ws);

  // const { ipv6, forwardedIP } = getClientIPs(req);
  // console.log(`Client connected IP: ${ipv6 || forwardedIP}`);

  const networkId = getNetworkId(clientIP);

  // User wirt direkt in ein Netzwerk gejoined
  if (networkId) {
    if (!rooms.has(networkId)) {
      rooms.set(networkId, new Set());
    }
    rooms.get(networkId).add(id);

    console.log(`Client ${id} joined network ${networkId}`);
    console.log(`Network peers: ${Array.from(rooms.get(networkId))}`);
  }
  ws.networkId = networkId;

  ws.send(JSON.stringify({ type: "welcome", id }));
  //broadcastPeerList(); // Broadcast to all when new client connects

  ws.on("message", message => {
    console.log(`Received: ${message}`);
    const data = JSON.parse(message);

    switch (data.type) {
      case "set-username":
        // Set the username of the client
        ws.username = data.username;
        ws.avatarNr = data.avatarNr;
        console.log(`Client ${id} set username: ${data.username}`);

        broadcastNewClient(id); // Broadcast to all when new client connects
        broadcastExistingClients(id); // Broadcast to new client the existing clients

        break;
      case "answer":
        // Track this connection in the database
        db.trackConnection();
      case "offer":
      case "candidate":
        // Relay the message to the target peer
        if (data.targetId && clients.has(data.targetId)) {
          clients.get(data.targetId).send(
            JSON.stringify({
              ...data,
              senderId: id, // Include sender ID for reference
            })
          );
        } else {
          ws.send(
            JSON.stringify({ type: "error", message: "Target peer not found" })
          );
        }
        break;

      default:
        console.log("Unknown message type:", data.type);
    }
  });

  ws.on("close", () => {
    console.log(`Client disconnected: ${id}`);
    // broadcastPeerList();
    broadcastClientDisconnect(id); // Broadcast to all when client disconnects
    clients.delete(id);

    // Remove client from room
    if (networkId && rooms.has(networkId)) {
      rooms.get(networkId).delete(id);
      if (rooms.get(networkId).size === 0) {
        rooms.delete(networkId);
      }
      console.log(`Client ${id} left network ${networkId}`);
      const networkPeers = rooms.get(networkId)
        ? Array.from(rooms.get(networkId))
        : [];
      console.log(`Network peers: ${networkPeers}`);
    }
  });
});

// Start the server on port 8080
server.listen(8080, () => {
  console.log("Server running on http://localhost:8080 (dual-stack IPv4/IPv6)");
  console.log("Dashboard available at http://localhost:8080/dashboard");
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  db.closeDatabase();
  process.exit(0);
});
