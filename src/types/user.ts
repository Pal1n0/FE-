export interface User {
  pk: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface UserSettings {
  id: string;
  user: string;
  language: string;
  preferred_currency: string;
  date_format: string;
  options: {
    language: [string, string][];
    preferred_currency: [string, string][];
    date_format: [string, string][];
  };
}
