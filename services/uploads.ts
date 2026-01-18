import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

import { API_BASE_URL } from "@/services/api";
import { getStoredToken } from "@/services/auth";

type UploadResponse = {
  urls: string[];
};

type UploadOptions = {
  circleCrop?: boolean;
  outputSize?: number;
  offsetX?: number;
  offsetY?: number;
  cropSize?: number;
  previewImageSize?: number;
};

const loadImage = (blob: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to load image."));
    };
    image.src = url;
  });

export async function uploadImageAsync(
  uri: string,
  fileName?: string,
  mimeType?: string,
  options?: UploadOptions,
): Promise<string> {
  const token = await getStoredToken();
  const name = fileName ?? `avatar-${Date.now()}.jpg`;
  const type = mimeType ?? "image/jpeg";

  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    const formData = new FormData();
    if (options?.circleCrop) {
      const image = await loadImage(blob);
      const squareSize = Math.min(image.width, image.height);
      const outputSize = options.outputSize ?? squareSize;
      const previewImageSize = options.previewImageSize ?? squareSize;
      const cropSize = options.cropSize ?? previewImageSize;
      const offsetX = options.offsetX ?? 0;
      const offsetY = options.offsetY ?? 0;
      const scale = previewImageSize / squareSize;
      const sourceCropSize = squareSize * (cropSize / previewImageSize);
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to process image.");
      const radius = outputSize / 2;
      context.clearRect(0, 0, outputSize, outputSize);
      context.beginPath();
      context.arc(radius, radius, radius, 0, Math.PI * 2, true);
      context.closePath();
      context.clip();
      const squareOffsetX = (image.width - squareSize) / 2;
      const squareOffsetY = (image.height - squareSize) / 2;
      let centerX = squareOffsetX + squareSize / 2 - offsetX / scale;
      let centerY = squareOffsetY + squareSize / 2 - offsetY / scale;
      const halfCrop = sourceCropSize / 2;
      const minX = halfCrop;
      const minY = halfCrop;
      const maxX = image.width - halfCrop;
      const maxY = image.height - halfCrop;
      centerX = Math.min(maxX, Math.max(minX, centerX));
      centerY = Math.min(maxY, Math.max(minY, centerY));
      const sx = centerX - halfCrop;
      const sy = centerY - halfCrop;
      context.drawImage(
        image,
        sx,
        sy,
        sourceCropSize,
        sourceCropSize,
        0,
        0,
        outputSize,
        outputSize,
      );
      const canvasBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (!result) {
            reject(new Error("Unable to process image."));
            return;
          }
          resolve(result);
        }, "image/png");
      });
      const outputName = name.replace(/\.[^/.]+$/, ".png");
      formData.append(
        "files",
        new File([canvasBlob], outputName, { type: "image/png" }),
      );
    } else {
      formData.append("files", new File([blob], name, { type }));
    }
    const upload = await fetch(`${API_BASE_URL}/api/uploads/images`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!upload.ok) {
      const message = await upload.text();
      throw new Error(message || `Upload failed (${upload.status})`);
    }
    const data = (await upload.json()) as UploadResponse;
    const url = data.urls?.[0];
    if (!url) throw new Error("Upload failed");
    return url;
  }

  const result = await FileSystem.uploadAsync(
    `${API_BASE_URL}/api/uploads/images`,
    uri,
    {
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "files",
      mimeType: type,
      httpMethod: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      parameters: {
        fileName: name,
      },
    },
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(result.body || `Upload failed (${result.status})`);
  }

  const data = JSON.parse(result.body || "{}") as UploadResponse;
  const url = data.urls?.[0];
  if (!url) {
    throw new Error("Upload failed");
  }

  return url;
}
