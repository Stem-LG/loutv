export interface Item {
  name: string;
  logo?: string;
  url: string;
}

export interface Category {
  id?: string;
  name: string;
  type: "movie" | "series" | "live" | "unknown";
  items: Item[];
}

export interface LoginCredentials {
  username: string;
  password: string;
  server: string;
}

export interface UserInfo {
  username: string;
  password: string;
  message: string;
  auth: number;
  status: string;
  exp_date: string;
  is_trial: string;
  active_cons: string;
  created_at: string;
  max_connections: string;
  allowed_output_formats: string[];
}

export interface ServerInfo {
  url: string;
  port: string;
  https_port: string;
  server_protocol: string;
  rtmp_port: string;
  timezone: string;
  timestamp_now: number;
  time_now: string;
}

export interface AccountInfo {
  user_info: UserInfo;
  server_info: ServerInfo;
} 