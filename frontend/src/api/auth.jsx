import api from './axios';

export const loginKakao = () => {
  window.location.href = 'http://localhost:8000/auth/kakao';
};

export const loginGoogle = () => {
  window.location.href = 'http://localhost:8000/auth/google';
};

export const loginNaver = () => {
  window.location.href = 'http://localhost:8000/auth/naver';
};