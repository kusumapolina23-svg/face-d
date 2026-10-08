const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusText = document.getElementById("status");
const emotionText = document.getElementById("emotion");
const confidenceText = document.getElementById("confidence");
const emoji = document.getElementById("emoji");

let stream = null;
let detecting = false;
let modelsLoaded = false;

async function loadModels() {
    try {
        statusText.innerText = "Loading AI models...";
        const weightsUrl = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
        await faceapi.nets.tinyFaceDetector.loadFromUri(weightsUrl);
        await faceapi.nets.faceExpressionNet.loadFromUri(weightsUrl);
        modelsLoaded = true;
        statusText.innerText = "AI models loaded. Start the camera.";
    } catch (error) {
        console.error(error);
        statusText.innerText = "Unable to load AI models. Check your internet connection.";
    }
}

async function startCamera() {
    if (!modelsLoaded) {
        statusText.innerText = "AI models are still loading.";
        return;
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        video.srcObject = stream;
        detecting = true;
        statusText.innerText = "🟢 Camera Active - Look at the camera";
        detectFace();
    } catch (error) {
        console.error(error);
        statusText.innerText = "❌ Camera permission denied or camera unavailable.";
    }
}

function stopCamera() {
    detecting = false;
    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
    }
    video.srcObject = null;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    statusText.innerText = "Camera stopped";
    emotionText.innerText = "Neutral";
    emoji.innerText = "😐";
    confidenceText.innerText = "Confidence: 0%";
}

async function detectFace() {
    if (!detecting) return;

    if (video.readyState >= 2) {
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        canvas.width = displaySize.width;
        canvas.height = displaySize.height;
        const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
            const resized = faceapi.resizeResults(detection, displaySize);
            const box = resized.detection.box;
            context.strokeStyle = "#00ff99";
            context.lineWidth = 4;
            context.strokeRect(box.x, box.y, box.width, box.height);
            const expressions = resized.expressions;
            const detectedEmotion = ["happy", "sad", "neutral"].reduce((best, current) =>
                expressions[current] > expressions[best] ? current : best
            );
            updateEmotion(detectedEmotion, expressions[detectedEmotion] * 100);
            statusText.innerText = "🟢 Face Detected";
        } else {
            statusText.innerText = "🔍 No Face Detected";
            emotionText.innerText = "Waiting...";
            emoji.innerText = "👤";
            confidenceText.innerText = "Confidence: 0%";
        }
    }

    requestAnimationFrame(detectFace);
}

function updateEmotion(emotion, confidence) {
    const labels = {
        happy: ["Happy 😊", "😊"],
        sad: ["Sad 😢", "😢"],
        neutral: ["Neutral 😐", "😐"]
    };
    const [label, symbol] = labels[emotion] || labels.neutral;
    emotionText.innerText = label;
    emoji.innerText = symbol;
    confidenceText.innerText = `Confidence: ${Math.round(confidence)}%`;
}

startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);
loadModels();
