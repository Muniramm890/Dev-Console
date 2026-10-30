import { apiRequest } from "./client";
// FILE: teacher-app/src/api/uploads.ts
// Source: admin App.tsx -> compressImage [23742-23783], uploadToCloudinary [23785-23804]
// @ts-nocheck

// Image ko upload se pehle chhota (compress) karne ka function
export const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.7 // 70% Quality — size drops from 5MB to ~40KB
        );
      };
    };
  });
};

export const uploadToCloudinary = async (file, kind = "general") => {
  // Step A: Instant Compress
  const compressedFile = await compressImage(file);

  // Step B: the server signs the upload (logged-in users only, images only, own school folder) - no public preset any more
  const sig = (await apiRequest("/files/sign-upload", "POST", { kind }))?.data;
  if (!sig?.signature) throw new Error("Could not start the upload");

  const formData = new FormData();
  formData.append("file", compressedFile);
  formData.append("api_key", sig.api_key);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("signature", sig.signature);
  formData.append("folder", sig.folder);
  formData.append("allowed_formats", sig.allowed_formats);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`, { method: "POST", body: formData });
  const data = await res.json();
  if (data.secure_url) return data.secure_url;
  throw new Error(data.error?.message || "Upload failed");
};
