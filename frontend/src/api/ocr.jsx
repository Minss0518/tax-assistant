import api from './axios';

export const uploadReceipt = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);

  const res = await api.post('/ocr/receipt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res;
};
