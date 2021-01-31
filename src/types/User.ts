export interface User {
  user_id: string;
  email: string;
  password: string;
  name: string;
  role: 'patient' | 'clinic';
}
