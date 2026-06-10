// api/user.js
import { apiClient } from "./apiClient";

const USER_URL = "/users";

export const fetchUsers = async (params = {}) => {
  const res = await apiClient.get(USER_URL, { params });
  return res.data;
};

export const fetchUserStats = async () => {
  const res = await apiClient.get(`${USER_URL}/stats`);
  return res.data;
};

export const fetchBusinessUsers = async (params = {}) => {
  const res = await apiClient.get(`${USER_URL}/business`, { params });
  return res.data;
};

export const fetchBusinessUserStats = async () => {
  const res = await apiClient.get(`${USER_URL}/business/stats`);
  return res.data;
};

export const fetchLoggedInUsers = async () => {
  const res = await apiClient.get(`${USER_URL}/active-sessions`);
  return res.data;
};

export const logoutUserFromAllDevices = async (id) => {
  const res = await apiClient.delete(`${USER_URL}/${id}/active-sessions`);
  return res.data;
};

export const createBusinessUser = async (data) => {
  const res = await apiClient.post(`${USER_URL}/business`, data);
  return res.data;
};

export const resetUserPassword = async (id, data) => {
  const res = await apiClient.patch(`${USER_URL}/${id}/reset-password`, data);
  return res.data;
};

export const toggleUserStatus = async (id) => {
  const res = await apiClient.patch(`${USER_URL}/${id}/toggle-status`);
  return res.data;
};

export const resetBusinessUserPassword = async (id, data) => {
  const res = await apiClient.patch(`${USER_URL}/business/${id}/reset-password`, data);
  return res.data;
};

export const toggleBusinessUserStatus = async (id) => {
  const res = await apiClient.patch(`${USER_URL}/business/${id}/toggle-status`);
  return res.data;
};
