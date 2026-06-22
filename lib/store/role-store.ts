'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'student' | 'teacher';

interface RoleState {
  role: UserRole;
  studentId: string;
  teacherId: string;
  isLoggedIn: boolean;
  setRole: (role: UserRole) => void;
  setStudentId: (id: string) => void;
  setTeacherId: (id: string) => void;
  setLoggedIn: (value: boolean) => void;
  logout: () => void;
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: 'student',
      studentId: 's1',
      teacherId: 't1',
      isLoggedIn: false,
      setRole: (role) => set({ role }),
      setStudentId: (id) => set({ studentId: id }),
      setTeacherId: (id) => set({ teacherId: id }),
      setLoggedIn: (value) => set({ isLoggedIn: value }),
      logout: () => set({ isLoggedIn: false }),
    }),
    {
      name: 'akses-role',
    }
  )
);
