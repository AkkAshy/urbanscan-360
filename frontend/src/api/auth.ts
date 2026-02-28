import api from "./client";
import type { User } from "../types";

interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login/", {
    username,
    password,
  });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me/");
  return data;
}
