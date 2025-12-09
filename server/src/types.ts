// Tipos para autenticación y usuarios
export type User = {
  id: string;
  username: string;
  email: string;
  password: string; // hasheada
  isAdmin: boolean;
  isFirstAdmin: boolean;
  createdAt: Date;
};

export type UserResponse = Omit<User, 'password'>;

export type CustomPokemon = {
  id: number;
  name: string;
  types: string[];
  sprite: string; // URL o base64
  description: string;
  evolutions?: string[]; // nombres o IDs
  createdBy: string; // userId
  createdAt: Date;
};

export type AuthPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = AuthPayload & {
  username: string;
};

export type JwtPayload = {
  userId: string;
  email: string;
  isAdmin: boolean;
};
