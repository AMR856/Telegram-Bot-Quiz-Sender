const outputEl = document.getElementById("output");
const responseBadgeEl = document.getElementById("responseBadge");
const responseMetaEl = document.getElementById("responseMeta");
const galleryEl = document.getElementById("gallery");
const galleryCountEl = document.getElementById("galleryCount");

const els = {
  baseUrl: document.getElementById("baseUrl"),
  apiKey: document.getElementById("apiKey"),
  chatId: document.getElementById("chatId"),
  botToken: document.getElementById("botToken"),
  isChannel: document.getElementById("isChannel"),
  imageFile: document.getElementById("imageFile"),
  imagesFiles: document.getElementById("imagesFiles"),
  imagesLimit: document.getElementById("imagesLimit"),
  imagesCursor: document.getElementById("imagesCursor"),
  delayMs: document.getElementById("delayMs"),
  quizzesJson: document.getElementById("quizzesJson"),
  jobId: document.getElementById("jobId"),
  healthBtn: document.getElementById("healthBtn"),
  signInBtn: document.getElementById("signInBtn"),
  uploadBtn: document.getElementById("uploadBtn"),
  uploadManyBtn: document.getElementById("uploadManyBtn"),
  listImagesBtn: document.getElementById("listImagesBtn"),
  sendQuizzesBtn: document.getElementById("sendQuizzesBtn"),
  jobStatusBtn: document.getElementById("jobStatusBtn"),
};

const storedApiKey = localStorage.getItem("apiKey");
if (storedApiKey) {
  els.apiKey.value = storedApiKey;
}

els.baseUrl.value = window.location.origin === "null" ? "http://localhost:3000" : window.location.origin;

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function setOutput(value) {
  outputEl.textContent = typeof value === "string" ? value : pretty(value);
}

function setBadge({ ok, status }) {
  responseBadgeEl.classList.remove("ok", "err");

  if (typeof status !== "number") {
    responseBadgeEl.textContent = "idle";
    return;
  }

  responseBadgeEl.textContent = ok ? `ok ${status}` : `err ${status}`;
  responseBadgeEl.classList.add(ok ? "ok" : "err");
}

function updateGallery(images = []) {
  galleryEl.innerHTML = "";
  const safeImages = Array.isArray(images) ? images : [];

  galleryCountEl.textContent = `${safeImages.length} item${safeImages.length === 1 ? "" : "s"}`;

  safeImages.forEach((image) => {
    const card = document.createElement("article");
    card.className = "gallery-item";

    const img = document.createElement("img");
    img.src = image.url || image.secureUrl;
    img.alt = image.publicId || "uploaded image";
    img.loading = "lazy";

    const caption = document.createElement("div");
    caption.className = "caption";
    caption.textContent = image.publicId || image.url || image.secureUrl || "image";

    card.appendChild(img);
    card.appendChild(caption);
    galleryEl.appendChild(card);
  });
}

function presentResult(label, result) {
  responseMetaEl.textContent = `${label} · ${result.url}`;
  setBadge(result);
  setOutput(result);

  const data = result.data && result.data.data;
  if (!data) {
    return;
  }

  if (Array.isArray(data.images)) {
    updateGallery(data.images);
  } else if (data.url || data.secureUrl) {
    updateGallery([data]);
  }
}

function presentError(label, error) {
  responseMetaEl.textContent = `${label} · client error`;
  setBadge({ ok: false, status: 0 });
  setOutput({ error: error.message });
}

function getBaseUrl() {
  const customUrl = els.baseUrl.value.trim();
  return customUrl || window.location.origin;
}

function getApiKey() {
  const key = els.apiKey.value.trim();
  if (key) {
    localStorage.setItem("apiKey", key);
  }
  return key;
}

async function request(path, options = {}) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, options);
  const raw = await response.text();
  let data = raw;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (_error) {
    data = raw;
  }

  return {
    ok: response.ok,
    status: response.status,
    url,
    data,
  };
}

function withApiKey(headers = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("x-api-key is required for this route");
  }

  return {
    ...headers,
    "x-api-key": apiKey,
  };
}

els.healthBtn.addEventListener("click", async () => {
  responseMetaEl.textContent = "Loading /health ...";
  try {
    const result = await request("/health");
    presentResult("GET /health", result);
  } catch (error) {
    presentError("GET /health", error);
  }
});

els.signInBtn.addEventListener("click", async () => {
  responseMetaEl.textContent = "Signing in ...";

  try {
    const payload = {
      chatId: els.chatId.value.trim(),
      botToken: els.botToken.value.trim(),
      isChannel: els.isChannel.checked,
    };

    const result = await request("/auth/sign-in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const keyFromResponse = result.data && result.data.data && result.data.data.apiKey;
    if (keyFromResponse) {
      els.apiKey.value = keyFromResponse;
      localStorage.setItem("apiKey", keyFromResponse);
    }

    presentResult("POST /auth/sign-in", result);
  } catch (error) {
    presentError("POST /auth/sign-in", error);
  }
});

els.uploadBtn.addEventListener("click", async () => {
  responseMetaEl.textContent = "Uploading image ...";

  try {
    const file = els.imageFile.files && els.imageFile.files[0];
    if (!file) {
      throw new Error("Please choose an image file first");
    }

    const formData = new FormData();
    formData.append("image", file);

    const result = await request("/images/upload", {
      method: "POST",
      headers: withApiKey(),
      body: formData,
    });

    presentResult("POST /images/upload", result);
  } catch (error) {
    presentError("POST /images/upload", error);
  }
});

els.uploadManyBtn.addEventListener("click", async () => {
  responseMetaEl.textContent = "Uploading many images ...";

  try {
    const files = els.imagesFiles.files ? Array.from(els.imagesFiles.files) : [];
    if (files.length === 0) {
      throw new Error("Please choose one or more images first");
    }

    if (files.length > 10) {
      throw new Error("You can upload up to 10 images at once");
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });

    const result = await request("/images/upload-many", {
      method: "POST",
      headers: withApiKey(),
      body: formData,
    });

    presentResult("POST /images/upload-many", result);
  } catch (error) {
    presentError("POST /images/upload-many", error);
  }
});

els.listImagesBtn.addEventListener("click", async () => {
  responseMetaEl.textContent = "Fetching uploaded images ...";

  try {
    const params = new URLSearchParams();
    const limit = els.imagesLimit.value.trim();
    const nextCursor = els.imagesCursor.value.trim();

    if (limit) {
      params.set("limit", limit);
    }

    if (nextCursor) {
      params.set("nextCursor", nextCursor);
    }

    const suffix = params.toString() ? `?${params.toString()}` : "";
    const result = await request(`/images${suffix}`, {
      method: "GET",
      headers: withApiKey(),
    });

    const cursor = result.data && result.data.data && result.data.data.nextCursor;
    if (cursor) {
      els.imagesCursor.value = cursor;
    }

    presentResult("GET /images", result);
  } catch (error) {
    presentError("GET /images", error);
  }
});

els.sendQuizzesBtn.addEventListener("click", async () => {
  responseMetaEl.textContent = "Sending quizzes ...";

  try {
    const quizzes = JSON.parse(els.quizzesJson.value);
    const payload = {
      delayMs: Number(els.delayMs.value || 0),
      quizzes,
    };

    const result = await request("/quizzes/send", {
      method: "POST",
      headers: withApiKey({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
    });

    const jobId = result.data && result.data.data && result.data.data.jobId;
    if (jobId) {
      els.jobId.value = jobId;
    }

    presentResult("POST /quizzes/send", result);
  } catch (error) {
    presentError("POST /quizzes/send", error);
  }
});

els.jobStatusBtn.addEventListener("click", async () => {
  responseMetaEl.textContent = "Fetching job status ...";

  try {
    const jobId = els.jobId.value.trim();
    if (!jobId) {
      throw new Error("Please provide a jobId");
    }

    const result = await request(`/jobs/${encodeURIComponent(jobId)}`, {
      method: "GET",
      headers: withApiKey(),
    });

    presentResult("GET /jobs/:id", result);
  } catch (error) {
    presentError("GET /jobs/:id", error);
  }
});

// [
// {
//   question: "What is the primary function of the Transport Layer?",
//   options: ["Route packets between networks", "Provide logical communication between processes on different hosts", "Provide logical communication between hosts", "Manage physical transmission of bits"],
//   correctAnswerId: 1,
//   explanation: "The Transport Layer provides logical communication between application processes running on different hosts, while the Network Layer provides logical communication between hosts.",
// "image": "https://res.cloudinary.com/dl6nplopj/image/upload/v1775420880/1003730571930/1_kicnlz.png"
// },
// {
//   question: "Which transport protocol provides reliable, connection-oriented data transfer?",
//   options: ["UDP", "IP", "TCP", "ICMP"],
//   correctAnswerId: 2,
//   explanation: "TCP (Transmission Control Protocol) is connection-oriented and provides reliable data transfer with error detection, retransmission, and flow control.",
// "image": "https://res.cloudinary.com/dl6nplopj/image/upload/v1775420880/1003730571930/1_kicnlz.png"

// },
// {
//   question: "Which transport protocol provides unreliable, connectionless data transfer?",
//   options: ["TCP", "UDP", "FTP", "SMTP"],
//   correctAnswerId: 1,
//   explanation: "UDP (User Datagram Protocol) provides unreliable, connectionless transfer of datagrams — it does not guarantee delivery, ordering, or duplicate protection.",
// "image": "https://res.cloudinary.com/dl6nplopj/image/upload/v1775420880/1003730571930/1_kicnlz.png"

// },
// {
//   question: "What is the unit of data at the Transport Layer?",
//   options: ["Frame", "Datagram", "Segment", "Bit"],
//   correctAnswerId: 2,
//   explanation: "The Transport Layer breaks application messages into segments. The data unit at the Transport Layer is called a segment.",
// "image": "https://res.cloudinary.com/dl6nplopj/image/upload/v1775420873/1003730571930/26_zjfvsq.png"

// },
// {
//   question: "What is the unit of data at the Network Layer?",
//   options: ["Segment", "Frame", "Datagram", "Packet"],
//   correctAnswerId: 2,
//   explanation: "The Network Layer encapsulates transport-layer segments into datagrams. The data unit at the Network Layer is called a datagram.",
// "image": "https://res.cloudinary.com/dl6nplopj/image/upload/v1775420880/1003730571930/1_kicnlz.png"

// },
// {
//   question: "What is the unit of data at the Data Link Layer?",
//   options: ["Datagram", "Segment", "Frame", "Cell"],
//   correctAnswerId: 2,
//   explanation: "The Data Link Layer encapsulates network-layer datagrams into frames for transmission over a physical link.",
// "image": "https://res.cloudinary.com/dl6nplopj/image/upload/v1775420880/1003730571930/1_kicnlz.png"
// },
// {
//   question: "In a TCP connection, what is the purpose of a 3-way handshake?",
//   options: ["To terminate the connection", "To establish a connection and exchange initial sequence numbers", "To perform flow control", "To perform congestion control"],
//   correctAnswerId: 1,
//   explanation: "The TCP 3-way handshake establishes a connection between sender and receiver, during which they exchange SYN and ACK messages and agree on initial sequence numbers."
// },
// {
//   question: "Which TCP flags are used for connection management?",
//   options: ["ECN, CWR, URG", "RST, SYN, FIN", "PSH, ACK, URG", "SYN, PSH, ECN"],
//   correctAnswerId: 1,
//   explanation: "RST (reset), SYN (synchronize), and FIN (finish) are the TCP flags used for connection management — opening and closing connections.",

// }
// ]