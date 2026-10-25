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

export const uploadToCloudinary = async (file) => {
  const CLOUD_NAME = "vosr6w5p"; // Apna Cloud Name
  const UPLOAD_PRESET = "school_erp_files"; // Apna Unsigned Preset

  // Step A: Instant Compress
  const compressedFile = await compressImage(file);

  const formData = new FormData();
  formData.append("file", compressedFile);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (data.secure_url) return data.secure_url;
  throw new Error(data.error?.message || "Upload failed");
};
