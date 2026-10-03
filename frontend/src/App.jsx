import { useState } from "react";

function App() {

  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [jobId, setJobId] = useState("");
  const [outputKey, setOutputKey] = useState("");
  const [outputUrl, setOutputUrl] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://18.60.233.189:5000";

  const uploadFile = async () => {

    if (!file) {
      alert("Select an image first");
      return;
    }

    try {
      setStatus("Preparing upload...");
      const response = await fetch(`${API_URL}/api/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type
        })
      });
      if (!response.ok) throw new Error("Could not prepare upload");

      const data = await response.json();
      setJobId(data.jobId);

      setStatus("Uploading image...");
      const uploadResponse = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      });
      if (!uploadResponse.ok) throw new Error("Image upload failed");

      setStatus("Queueing rendering job...");
      const jobResponse = await fetch(`${API_URL}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: data.jobId, inputKey: data.key })
      });
      if (!jobResponse.ok) throw new Error("Could not queue rendering job");

      setStatus("Rendering image...");
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const statusResponse = await fetch(`${API_URL}/api/jobs/${data.jobId}`);
        if (!statusResponse.ok) throw new Error("Could not check job status");
        const statusData = await statusResponse.json();

        if (statusData.status === "completed") {
          setOutputKey(statusData.outputKey);
          const outputResponse = await fetch(
            `${API_URL}/api/jobs/${data.jobId}/output-url`
          );
          if (!outputResponse.ok) {
            throw new Error("Could not prepare the download");
          }
          const outputData = await outputResponse.json();
          setOutputUrl(outputData.outputUrl);
          setStatus("Rendering complete!");
          return;
        }
      }

      setStatus("Rendering is taking longer than expected. Check again shortly.");
    } catch (error) {
      console.error(error);
      setStatus(error.message || "The rendering request failed.");
    }

  };


  return (
    <div className="container">

      <h1>AWS Batch Rendering</h1>

      <p>
        Upload an image and process it using
        EC2 Spot Workers.
      </p>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={uploadFile}>
        Upload & Render
      </button>

      <h3>{status}</h3>

      {jobId && (
        <p>
          Job ID: {jobId}
        </p>
      )}

      {outputKey && (
        <p>
          Output: {outputKey}
        </p>
      )}

      {outputUrl && (
        <a href={outputUrl} download={outputKey} target="_blank" rel="noreferrer">
          <button type="button">Download Rendered Output</button>
        </a>
      )}

    </div>
  );
}

export default App;