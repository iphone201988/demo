// const express = require("express");
// const fs = require("fs");
// const https = require("https");
// const vosk = require("vosk");
// const ffmpeg = require("fluent-ffmpeg");
// const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
// const path = require("path");
// const os = require("os");
// const morgan=require("morgan");

// ffmpeg.setFfmpegPath(ffmpegPath);

// const modelPath = "./models/vosk-model-small-en-us-0.15"; // Path to your Vosk model
// const model = new vosk.Model(modelPath);

// const app = express();
// app.use(express.json());

// app.use(morgan("dev"));

// // Helper function to download audio file from URL
// function downloadAudio(url) {
//   const tempFilePath = path.join(os.tmpdir(), `${Date.now()}_temp_audio.wav`);
//   return new Promise((resolve, reject) => {
//     const file = fs.createWriteStream(tempFilePath);
//     https.get(url, (response) => {
//       if (response.statusCode !== 200) {
//         reject(new Error(`Failed to download audio from URL: ${response.statusCode}`));
//         return;
//       }
//       response.pipe(file);
//       file.on("finish", () => file.close(() => resolve(tempFilePath)));
//     }).on("error", (err) => {
//       fs.unlink(tempFilePath, () => reject(err));
//     });
//   });
// }

// // Helper function to transcribe audio
// function audioToText(audioFilePath) {
//   return new Promise((resolve, reject) => {
//     const process = ffmpeg(audioFilePath)
//       .audioChannels(1)
//       .audioFrequency(16000)
//       .format("wav")
//       .pipe();

//     const recognizer = new vosk.Recognizer({ model: model, sampleRate: 16000 });
//     recognizer.setWords(true);

//     let resultText = "";
//     process.on("data", (chunk) => {
//       if (recognizer.acceptWaveform(chunk)) {
//         const result = recognizer.result();
//         resultText += result.text + " ";
//       }
//     });

//     process.on("end", () => {
//       resultText += recognizer.finalResult().text;
//       recognizer.free();
//       resolve(resultText.trim());
//     });

//     process.on("error", (err) => {
//       recognizer.free();
//       reject(new Error(`Audio processing error: ${err.message}`));
//     });
//   });
// }

// // API endpoint to transcribe audio from a URL
// app.post("/transcribe", async (req, res) => {
//   const { audioUrl } = req.body;
//   console.log("req.file",req.file,req.body,req.files)

//   if (!audioUrl) {
//     return res.status(400).json({ error: "Missing audioUrl in request body" });
//   }

//   try {
//     const audioFilePath = await downloadAudio(audioUrl);
//     console.log("audioFilePath",audioFilePath)
//     const transcribedText = await audioToText(audioFilePath);
//     fs.unlinkSync(audioFilePath); // Clean up the temp file after processing
//     res.json({ text: transcribedText });
//   } catch (error) {
//     console.error("Error during transcription:", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
const express = require("express");
const fs = require("fs");
const https = require("https");
const vosk = require("vosk");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const multer = require("multer");
const path = require("path");
const morgan=require("morgan");
const cors =require("cors");

ffmpeg.setFfmpegPath(ffmpegPath);

const modelPath = "./models/vosk-model-small-en-us-0.15"; // Path to your Vosk model
const model = new vosk.Model(modelPath);

const app = express();
app.use(express.json());
app.use(morgan("dev"));
const corsOptions = {
  origin: "*",
  "Access-Control-Allow-Origin": "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
// Ensure the audio folder exists
const audioFolder = path.join(__dirname, "audio");
if (!fs.existsSync(audioFolder)) {
  fs.mkdirSync(audioFolder);
}

// Configure multer to store uploaded files in the audio folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioFolder);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// Helper function to transcribe audio
function audioToText(audioFilePath) {
  
  return new Promise((resolve, reject) => {
    const process = ffmpeg(audioFilePath)
      .audioChannels(1)
      .audioFrequency(16000)
      .format("wav")
      .pipe();

    const recognizer = new vosk.Recognizer({ model: model, sampleRate: 16000 });
    recognizer.setWords(true);

    let resultText = "";
    process.on("data", (chunk) => {
      if (recognizer.acceptWaveform(chunk)) {
        const result = recognizer.result();
        resultText += result.text + " ";
      }
    });

    process.on("end", () => {
      resultText += recognizer.finalResult().text;
      recognizer.free();
      resolve(resultText.trim());
    });

    process.on("error", (err) => {
      recognizer.free();
      reject(new Error(`Audio processing error: ${err.message}`));
    });
  });
}

// API endpoint to transcribe uploaded audio file
app.post("/transcribe", upload.single("audioFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file uploaded" });
  }

  const audioFilePath = req.file.path;

  try {
    console.log("audioFilePath", audioFilePath);
    const transcribedText = await audioToText(audioFilePath);
    fs.unlinkSync(audioFilePath); // Clean up the temp file after processing
    res.status(200).json({ text: transcribedText });
    console.log("transcribedText",transcribedText)
  } catch (error) {
    console.error("Error during transcription:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
