import {
  type ChangeEvent,
} from 'react';
import {
  type Teacher,
} from '../../lib/api';
import { fieldClass } from '../ui/form';

type TeacherIdentity = {
  name: string;
  nip: string;
  nuptk: string;
  phone: string;
  email: string;
  photoUrl: string;
};

type TeacherIdentityAccountPanelProps = {
  email: string;
  identity: TeacherIdentity;
  onEmailChange: (value: string) => void;
  onIdentityChange: (field: keyof TeacherIdentity, value: string) => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onUsernameChange: (value: string) => void;
  selectedTeacher: Teacher;
  username: string;
};

export function TeacherIdentityAccountPanel({
  email,
  identity,
  onEmailChange,
  onIdentityChange,
  onPhotoChange,
  onUsernameChange,
  selectedTeacher,
  username,
}: TeacherIdentityAccountPanelProps) {
  return (
    <>
      <div>
        <p className="text-sm font-black text-slate-800 dark:text-slate-100">Identitas Guru</p>
        <p className="mt-1 text-xs font-semibold text-muted">
          Lengkapi atau koreksi data hasil import sebelum mengatur akun dan jadwal.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ['name', 'Nama Lengkap'],
            ['nip', 'NIP'],
            ['nuptk', 'NUPTK'],
            ['phone', 'Nomor HP'],
            ['email', 'Email Guru'],
          ].map(([field, label]) => (
            <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200" key={field}>
              {label}
              <input
                className={`${fieldClass} font-normal`}
                onChange={(event) => onIdentityChange(field as keyof TeacherIdentity, event.target.value)}
                type={field === 'email' ? 'email' : 'text'}
                value={identity[field as keyof TeacherIdentity]}
              />
            </label>
          ))}
        </div>
        <label className="mt-3 grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          Foto Guru
          <input
            accept="image/jpeg,image/png,image/webp"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-black file:text-brand-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            onChange={onPhotoChange}
            type="file"
          />
        </label>
        {identity.photoUrl ? (
          <img
            alt={`Foto ${selectedTeacher.name}`}
            className="mt-3 size-20 rounded-xl border border-blue-100 object-cover dark:border-blue-400/20"
            src={identity.photoUrl}
          />
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          Username Login
          <input
            className={`${fieldClass} font-normal`}
            onChange={(event) => onUsernameChange(event.target.value)}
            value={username}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          Email Login
          <input
            className={`${fieldClass} font-normal`}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="opsional"
            type="email"
            value={email}
          />
        </label>
      </div>
    </>
  );
}
