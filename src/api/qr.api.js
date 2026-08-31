import { apiClient } from "./apiClient";

export const signArticleQr = async ({ articleNo, qrId, purchaseNumber }) => {
  const { data } = await apiClient.post("/qr/article/sign", { articleNo, qrId, purchaseNumber });
  return data.code;
};

export const verifyArticleQr = async (code) => {
  const { data } = await apiClient.post("/qr/article/verify", { code });
  return data;
};
