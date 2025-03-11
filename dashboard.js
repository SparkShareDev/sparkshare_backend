const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const Mustache = require("mustache");

// Read template file
// let template;
// try {
//   template = fs.readFileSync(
//     path.join(__dirname, "views", "dashboard.html"),
//     "utf8"
//   );
//   console.log("Dashboard template loaded successfully");
// } catch (err) {
//   console.error("Error loading dashboard template:", err);
//   template =
//     "<html><body><h1>Error loading dashboard template</h1><p>{{error}}</p></body></html>";
// }

// Dashboard route handler
router.get("/", async (req, res) => {
  try {
    const db = req.app.get("db");

    // Get date range, defaulting to last 30 days if not specified
    const endDate = req.query.endDate || new Date().toISOString().split("T")[0];
    const startDate =
      req.query.startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    // Get stats
    const dailyStats = await db.getDailyStats(startDate, endDate);
    console.log(`Retrieved ${dailyStats.length} daily stats records`);

    // Create a debug version of the data
    const dataDebug = JSON.stringify(dailyStats, null, 2);
    console.log(`Data to render: ${dataDebug}`);

    // Return HTML directly to avoid Mustache escaping issues
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>User Stats Dashboard</title>
        <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/chart.js/3.9.1/chart.min.js"></script> -->
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          :root {
            --primary: #4361ee;
            --primary-light: rgba(67, 97, 238, 0.2);
            --secondary: #3f37c9;
            --success: #4cc9f0;
            --danger: #f72585;
            --warning: #f8961e;
            --dark: #212529;
            --light: #f8f9fa;
            --border-radius: 12px;
            --shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            --transition: all 0.3s ease;
            --input-height: 46px; /* Define a consistent height for inputs and buttons */

          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f0f2f5;
            color: var(--dark);
            line-height: 1.6;
            padding: 0;
            margin: 0;
          }
          
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1.5rem;
            width: 100%;
          }
          
          header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.5rem;
            background-color: white;
            box-shadow: var(--shadow);
            border-radius: var(--border-radius);
            margin-bottom: 2rem;
            width: 100%;
          }
          
          h1, h2, h3 {
            font-weight: 600;
            color: var(--dark);
          }
          
          h1 {
            font-size: 1.8rem;
            margin: 0;
          }
          
          h2 {
            font-size: 1.4rem;
            margin-bottom: 1rem;
          }
          
          .card {
            background-color: white;
            border-radius: var(--border-radius);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: var(--shadow);
            transition: var(--transition);
            width: 100%;
          }
          
          .card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          }
          
          .date-range {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding: 1rem;
            background-color: var(--light);
            border-radius: 8px;
            width: 100%;
          }
          
          form {
            display: flex;
            align-items: flex-end; /* Align items to the bottom */
            flex-wrap: wrap;
            gap: 1rem;
            width: 100%;
          }
          
          .form-group {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-width: 200px;
            gap: 0.5rem;
          }
          
          label {
            font-size: 0.9rem;
            font-weight: 500;
            color: #555;
          }
          
          input[type="date"] {
            padding: 0.75rem 1rem;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            transition: var(--transition);
          }
          
          input[type="date"]:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px var(--primary-light);
          }
          
          button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            height: var(--input-height); /* Match height with inputs */
            align-self: flex-end; /* Ensure it aligns with the bottom of the form */
          }
          
          button:hover {
            background-color: var(--secondary);
          }
          
          .chart-container {
            height: 400px;
            position: relative;
            width: 100%;
          }
          
          .error {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background-color: rgba(247, 37, 133, 0.1);
            color: var(--danger);
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            font-weight: 500;
          }
          
          .stats-summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-bottom: 1.5rem;
            width: 100%;
          }
          
          .stat-card {
            background: white;
            padding: 1.25rem;
            border-radius: var(--border-radius);
            display: flex;
            flex-direction: column;
            box-shadow: var(--shadow);
          }
          
          .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary);
            margin: 0.5rem 0;
          }
          
          .stat-label {
            font-size: 0.9rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .stat-change {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.9rem;
            margin-top: 0.25rem;
          }
          
          .positive {
            color: #2ecc71;
          }
          
          .negative {
            color: var(--danger);
          }
          
          @media (max-width: 768px) {
            .container {
              padding: 1rem;
            }
            
            header {
              flex-direction: column;
              align-items: flex-start;
              gap: 1rem;
            }
            
            .stats-summary {
              grid-template-columns: 1fr;
            }
            
            .date-range {
              flex-direction: column;
              align-items: flex-start;
            }
            
            .chart-container {
              height: 300px;
            }
          }
          
          /* Medium screens */
          @media (min-width: 769px) and (max-width: 1024px) {
            .stats-summary {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          
          /* Large screens */
          @media (min-width: 1025px) {
            .stats-summary {
              grid-template-columns: repeat(3, 1fr);
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1><i class="fas fa-chart-line"></i> User Stats Dashboard (File Transfers / Answers)</h1>
            <div class="time-period">
              <span id="currentRange">Showing data from the past 30 days</span>
            </div>
          </header>
          
          <div class="stats-summary">
            <div class="stat-card">
              <div class="stat-label">Total Transfers</div>
              <div class="stat-value" id="totalConnections">0</div>
              <div class="stat-change positive">
                <i class="fas fa-arrow-up"></i> <span id="connectionChange">0%</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Average Daily</div>
              <div class="stat-value" id="avgConnections">0</div>
              <div class="stat-change" id="avgChangeContainer">
                <i class="fas fa-arrow-up"></i> <span id="avgChange">0%</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Peak Day</div>
              <div class="stat-value" id="peakConnections">0</div>
              <div class="stat-label" id="peakDate">-</div>
            </div>
          </div>
          
          <div class="card">
            <h2>Daily Transfers</h2>
            <div class="date-range">
              <form id="dateForm">
                <div class="form-group">
                  <label for="startDate">Start Date</label>
                  <input type="date" id="startDate" name="startDate" value="${startDate}">
                </div>
                
                <div class="form-group">
                  <label for="endDate">End Date</label>
                  <input type="date" id="endDate" name="endDate" value="${endDate}">
                </div>
                
                <button type="submit">
                  <i class="fas fa-sync-alt"></i> Update
                </button>
              </form>
            </div>
            <div class="chart-container">
              <canvas id="dailyChart"></canvas>
            </div>
            <div id="noDataMessage" class="error" style="display: none;">
              <i class="fas fa-exclamation-circle"></i> No data available for the selected date range
            </div>
          </div>
        </div>
        
        <script>
          // Chart initialization with enhanced options
          let dailyData = ${JSON.stringify(dailyStats)};
          console.log("Data loaded:", dailyData);
          
          // Calculate summary statistics
          function updateStats() {
            if (dailyData && dailyData.length > 0) {
              // Total connections
              const totalConnections = dailyData.reduce((sum, item) => sum + item.connections, 0);
              document.getElementById('totalConnections').textContent = totalConnections.toLocaleString();
              
              // Average connections
              const avgConnections = Math.round(totalConnections / dailyData.length);
              document.getElementById('avgConnections').textContent = avgConnections.toLocaleString();
              
              // Find peak day
              const peakDay = dailyData.reduce((max, item) => max.connections > item.connections ? max : item);
              document.getElementById('peakConnections').textContent = peakDay.connections.toLocaleString();
              document.getElementById('peakDate').textContent = new Date(peakDay.date).toLocaleDateString();
              
              // Calculate change percentage (just for demo)
              const firstHalf = dailyData.slice(0, Math.floor(dailyData.length / 2));
              const secondHalf = dailyData.slice(Math.floor(dailyData.length / 2));
              
              const firstHalfTotal = firstHalf.reduce((sum, item) => sum + item.connections, 0);
              const secondHalfTotal = secondHalf.reduce((sum, item) => sum + item.connections, 0);
              
              const changePercent = firstHalfTotal > 0 ? 
                Math.round(((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100) : 0;
              
              document.getElementById('connectionChange').textContent = \`\${Math.abs(changePercent)}%\`;
              
              // Update change icon classes
              const changeIcon = document.querySelector('.stat-change i');
              const changeContainer = document.getElementById('avgChangeContainer');
              
              if (changePercent >= 0) {
                changeIcon.className = 'fas fa-arrow-up';
                changeContainer.className = 'stat-change positive';
              } else {
                changeIcon.className = 'fas fa-arrow-down';
                changeContainer.className = 'stat-change negative';
              }
              
              document.getElementById('avgChange').textContent = \`\${Math.abs(changePercent)}%\`;
              
              // Set date range text
              if (dailyData.length > 0) {
                const firstDate = new Date(dailyData[0].date).toLocaleDateString();
                const lastDate = new Date(dailyData[dailyData.length - 1].date).toLocaleDateString();
                document.getElementById('currentRange').textContent = \`Showing data from \${firstDate} to \${lastDate}\`;
              }
            }
          }
          
          if (dailyData && dailyData.length > 0) {
            updateStats();
            
            const ctx = document.getElementById('dailyChart').getContext('2d');
            const gradientFill = ctx.createLinearGradient(0, 0, 0, 400);
            gradientFill.addColorStop(0, 'rgba(67, 97, 238, 0.3)');
            gradientFill.addColorStop(1, 'rgba(67, 97, 238, 0.0)');
            
            new Chart(ctx, {
              type: 'line',
              data: {
                labels: dailyData.map(item => {
                  const date = new Date(item.date);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }),
                datasets: [{
                  label: 'Connections',
                  data: dailyData.map(item => item.connections),
                  backgroundColor: gradientFill,
                  borderColor: 'rgba(67, 97, 238, 1)',
                  borderWidth: 3,
                  tension: 0.4,
                  pointBackgroundColor: '#ffffff',
                  pointBorderColor: 'rgba(67, 97, 238, 1)',
                  pointBorderWidth: 2,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  fill: true
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#212529',
                    bodyColor: '#212529',
                    bodyFont: {
                      size: 14
                    },
                    titleFont: {
                      size: 16,
                      weight: 'bold'
                    },
                    padding: 12,
                    displayColors: false,
                    borderWidth: 1,
                    borderColor: '#e0e0e0',
                    callbacks: {
                      title: function(tooltipItems) {
                        return new Date(dailyData[tooltipItems[0].dataIndex].date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      },
                      label: function(context) {
                        return \`Connections: \${context.raw.toLocaleString()}\`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(200, 200, 200, 0.1)',
                      drawBorder: false
                    },
                    ticks: {
                      precision: 0,
                      padding: 10,
                      font: {
                        size: 12
                      }
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      padding: 10,
                      font: {
                        size: 12
                      }
                    }
                  }
                },
                interaction: {
                  intersect: false,
                  mode: 'index'
                },
                elements: {
                  point: {
                    hoverBorderWidth: 3
                  }
                }
              }
            });
          } else {
            document.getElementById('noDataMessage').style.display = 'block';
          }
          
          // Form handling
          document.getElementById('dateForm').addEventListener('submit', function(e) {
            e.preventDefault();
            // Get the form values
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            // Redirect to the same page with new query parameters
            window.location.href = \`?\${startDate ? \`startDate=\${startDate}&\` : ''}\${endDate ? \`endDate=\${endDate}\` : ''}\`;
          });
        </script>
      </body>
      </html>
    `;

    // Return HTML dashboard
    res.send(html);
  } catch (err) {
    console.error("Error generating dashboard:", err);
    res
      .status(500)
      .send(
        `Error generating dashboard: ${err.message}<br><pre>${err.stack}</pre>`
      );
  }
});

// API endpoint for stats in JSON format
router.get("/api", async (req, res) => {
  try {
    const db = req.app.get("db");

    const endDate = req.query.endDate || new Date().toISOString().split("T")[0];
    const startDate =
      req.query.startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    const dailyStats = await db.getDailyStats(startDate, endDate);

    res.json({
      dailyStats,
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Error fetching stats" });
  }
});

module.exports = router;
