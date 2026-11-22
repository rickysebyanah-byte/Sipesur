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
 * Menghasilkan URL berkas lengkap dengan query token untuk autentikasi tab baru / pratinjau
 */
export const getFileUrl = (url) => {
  const token = localStorage.getItem('token') || '';
  const cleanUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
  const sep = cleanUrl.includes('?') ? '&' : '?';
  return token ? `${cleanUrl}${sep}token=${encodeURIComponent(token)}` : cleanUrl;
};

/**
 * Membuka pratinjau berkas (PDF / Gambar) di tab baru dengan dukungan refresh browser
 */
export const viewPdf = async (url) => {
  const directUrl = getFileUrl(url);
  const win = window.open(directUrl, '_blank');
  if (!win) {
    try {
      const res = await api.get(url, { responseType: 'blob' });
      if (res.data.type === 'application/json') {
        const text = await res.data.text();
        const err = JSON.parse(text);
        throw new Error(err.message || 'Gagal memuat berkas');
      }
      const contentType = res.headers['content-type'] || res.data.type || 'application/pdf';
      const blob = new Blob([res.data], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      alert('Gagal membuka pratinjau berkas: ' + (err.response?.data?.message || err.message));
    }
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
