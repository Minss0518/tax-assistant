import api from './axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const loginKakao = () => {
  window.location.href = `${BASE_URL}/auth/kakao`;
};

export const loginGoogle = () => {
  window.location.href = `${BASE_URL}/auth/google`;
};

export const loginNaver = () => {
  window.location.href = `${BASE_URL}/auth/naver`;
};