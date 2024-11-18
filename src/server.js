const express = require("express");
const axios = require("axios");
const fs = require("fs");
const unzipper = require("unzipper");
const path = require("path");
const cors = require("cors");
const csvParser = require("csv-parser");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
app.use(cors());
app.use(express.json());

// Temporary path to the FacultyResponses.csv file
const facultyResponsesPath = './public/data/FacultyResponses.csv';

// Ensure the CSV file exists, if not, create it
const csvWriter = createCsvWriter({
  path: facultyResponsesPath,
  header: [
      { id: 'email', title: 'Email' },
      { id: 'coursePrefix', title: 'Course Prefix' },
  ],
  append: true // Append data to the file instead of overwriting
});

// Check if the file exists, if not, create the header
fs.access(facultyResponsesPath, fs.constants.F_OK, (err) => {
  if (err) {
      // The file does not exist, create it and add the header
      csvWriter.writeRecords([]).then(() => {
          console.log('Created FacultyResponses.csv with header');
      });
  }
});

const SURVEY_ID = "SV_5gMaPpNjF7lFKbs";  
const BEARER_TOKEN = process.env.BEARER_TOKEN;  
const DATA_CENTER = "yul1";  

// Serve static files from the 'public' folder
app.use("/data", express.static(path.join(__dirname, "../public/data")));

// Step 1: Initiate data export
app.post("/export-responses", async (req, res) => {
  try {
    const exportUrl = `https://${DATA_CENTER}.qualtrics.com/API/v3/surveys/${SURVEY_ID}/export-responses`;
    const initiateExport = await axios.post(exportUrl, { format: "csv" }, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const progressId = initiateExport.data.result.progressId;
    console.log("Progress ID:", progressId);

    // Step 2: Poll for export status
    let progressStatus = "inProgress";
    let fileId;
    while (progressStatus === "inProgress") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const progressCheck = await axios.get(`${exportUrl}/${progressId}`, {
        headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
      });

      progressStatus = progressCheck.data.result.status;
      console.log("Export Status:", progressStatus);

      if (progressStatus === "complete") {
        fileId = progressCheck.data.result.fileId;
      } else if (progressStatus === "failed") {
        return res.status(500).send("Export failed.");
      }
    }

    // Step 3: Download the file
    const downloadUrl = `${exportUrl}/${fileId}/file`;
    const response = await axios.get(downloadUrl, {
      headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` },
      responseType: "stream"
    });

    // Save and unzip the file
    const path = "./responses.zip";
    const writer = fs.createWriteStream(path);
    response.data.pipe(writer);
    writer.on("finish", async () => {
      console.log("File downloaded. Extracting...");
      fs.createReadStream(path)
        .pipe(unzipper.Extract({ path: "./responses" }))
        .on("close", () => {
          console.log("File extracted.");
          res.send("Responses downloaded and extracted successfully.");
        });
    });

    writer.on("error", (error) => {
      console.error("Error writing file:", error);
      res.status(500).send("Error writing file.");
    });

  } catch (error) {
    console.error("Error in export process:", error.response ? error.response.data : error.message);
    res.status(500).send("Error in export process.");
  }
});

// Route to fetch class list CSV from GitHub and bypass CORS
app.get("/fetch-class-list", async (req, res) => {
  try {
    const url = "https://raw.githubusercontent.com/brianguida/cise-taas/main/TAAS%20input%20SP%2025%2010.22.24.csv";
    const response = await axios.get(url, { responseType: "stream" });
    res.setHeader("Content-Type", "text/csv");
    response.data.pipe(res);
  } catch (error) {
    console.error("Error fetching class list:", error);
    res.status(500).send("Error fetching class list");
  }
});

app.get("/student-info", (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).send("<h3>Error: Email query parameter is required</h3>");
  }

  // Path to the student data CSV file in ../public/data
  const studentDataPath = path.join(__dirname, "../public/data/CISE-TAAS_November 5, 2024_20.38.csv");

  const students = []; // Array to hold parsed student data

  fs.createReadStream(studentDataPath)
    .pipe(csvParser())
    .on("data", (row) => {
      students.push(row);
    })
    .on("end", () => {
      // Find the student by email
      const student = students.find(stu => (stu.shib_mail || '').toLowerCase() === email.toLowerCase());

      if (student) {
        // Create an HTML representation of the student data
        const studentHtml = `
          <html>
            <head>
              <title>Student Info</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                tr:nth-child(even) { background-color: #f9f9f9; }
              </style>
            </head>
            <body>
              <h1>Student Information</h1>
              <table>
                <tr><th>Recorded Date</th><td>${student.RecordedDate || 'N/A'}</td></tr>
                <tr><th>First Name</th><td>${student.shib_given || 'N/A'}</td></tr>
                <tr><th>Last Name</th><td>${student.shib_sn || 'N/A'}</td></tr>
                <tr><th>Email</th><td>${student.shib_mail || 'N/A'}</td></tr> <!-- Added student email -->
                <tr><th>Selected Semester</th><td>${student.selectedSemester || 'N/A'}</td></tr>
                <tr><th>College Status</th><td>${student['College Status'] || 'N/A'}</td></tr>
                <tr><th>GPA</th><td>${student.GPA || 'N/A'}</td></tr>
                <tr><th>Country of Origin</th><td>${student.countryOfOrigin || 'N/A'}</td></tr>
                <tr><th>SPEAK/TOEFL Score</th><td>${student['SPEAK andor TOEFLiBT'] || 'N/A'}</td></tr>
                <tr><th>Travel Plans</th><td>${student['Travel Plans'] || 'N/A'}</td></tr>
                <tr><th>Interests</th><td>${student.Interests || 'N/A'}</td></tr>
                <tr><th>Preferences</th><td>
                  <ul>
                    ${student.studentPref1 ? `<li>${student.studentPref1}</li>` : ''}
                    ${student.studentPref2 ? `<li>${student.studentPref2}</li>` : ''}
                    ${student.studentPref3 ? `<li>${student.studentPref3}</li>` : ''}
                    ${student.studentPref4 ? `<li>${student.studentPref4}</li>` : ''}
                    ${student.studentPref5 ? `<li>${student.studentPref5}</li>` : ''}
                  </ul>
                </td></tr>
              </table>
            </body>
          </html>
        `;

        res.send(studentHtml);
      } else {
        res.status(404).send("<h3>Student not found</h3>");
      }
    })
    .on("error", (error) => {
      console.error("Error reading CSV:", error);
      res.status(500).send("<h3>Error reading student data</h3>");
    });
});

// Record a student's course selection and append to FacultyResponses.csv
app.post('/record-selected-student', (req, res) => {
  const { email, coursePrefix } = req.body;
  console.log(`Recording selection: ${email} for course ${coursePrefix}`);

  // Write to the CSV file
  csvWriter.writeRecords([{ email, coursePrefix }])
      .then(() => {
          console.log('Selection recorded in FacultyResponses.csv');
          res.json({ message: 'Selection recorded successfully!' });
      })
      .catch((err) => {
          console.error('Error writing to CSV:', err);
          res.status(500).send('Error recording selection');
      });
});


// Handle unrecording a selected student
app.post('/unrecord-selected-student', (req, res) => {
  const { email, coursePrefix } = req.body;
  console.log(`Unselecting: ${email} for course ${coursePrefix}`);
  // Remove from database or handle unselection logic
  res.json({ message: 'Selection unrecorded' });
});



const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
