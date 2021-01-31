export interface User {
  userId: string;
  email: string;
  password: string;
  name: string;
  role: 'patient' | 'clinic';
}
