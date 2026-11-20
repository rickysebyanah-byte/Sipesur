import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.clear();
      location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Mengunduh berkas langsung ke perangkat pengguna (Download File)
 */
export const downloadPdf = async (url, defaultName = 'surat-resmi.pdf') => {
  try {
    const res = await api.get(url, { responseType: 'blob' });
    if (res.data.type === 'application/json') {
      const text = await res.data.text();
      const err = JSON.parse(text);
      throw new Error(err.message || 'Gagal mengunduh berkas');
    }

    let filename = defaultName;
    const disposition = res.headers['content-disposition'];
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const blobUrl = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 1500);
  } catch (err) {
    alert('Gagal mengunduh surat: ' + (err.response?.data?.message || err.message));
  }
};

/**
 * Membuka pratinjau berkas PDF di tab baru
 */
export const viewPdf = async (url) => {
  try {
    const res = await api.get(url, { responseType: 'blob' });
    if (res.data.type === 'application/json') {
      const text = await res.data.text();
      const err = JSON.parse(text);
      throw new Error(err.message || 'Gagal memuat berkas');
    }
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    alert('Gagal membuka pratinjau surat: ' + (err.response?.data?.message || err.message));
  }
};

/**
 * Kompatibilitas mundur untuk pemanggilan openBlob yang sudah ada
 */
export const openBlob = async (url, filename) => {
  if (filename) {
    return downloadPdf(url, filename);
  }
  return viewPdf(url);
};

export default api;
