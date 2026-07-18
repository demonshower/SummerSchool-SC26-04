'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { LoginDto } from '@/types/auth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginDto>();

  const onSubmit = async (data: LoginDto) => {
    setLoading(true); setError('');
    try {
      const res = await authApi.login(data);
      setAuth(res.accessToken, res.user);
      router.push('/trips');
    } catch (e: any) { setError(e.message || '登录失败'); } finally { setLoading(false); }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      const res = await authApi.guestLogin();
      setAuth(res.accessToken, res.user);
      router.push('/trips');
    } catch (e: any) { setError(e.message || '游客登录失败'); } finally { setLoading(false); }
  };

  return (
    <>
      <Navbar />
      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-5">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h3 className="text-center mb-4"><i className="bi bi-box-arrow-in-right me-2"></i>登录</h3>
                {error && <div className="alert alert-danger py-2 small">{error}</div>}
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="mb-3">
                    <label className="form-label">用户名</label>
                    <input {...register('username', { required: '请输入用户名' })} className={`form-control ${errors.username ? 'is-invalid' : ''}`} placeholder="请输入用户名" />
                    {errors.username && <div className="invalid-feedback">{errors.username.message}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">密码</label>
                    <input type="password" {...register('password', { required: '请输入密码' })} className={`form-control ${errors.password ? 'is-invalid' : ''}`} placeholder="请输入密码" />
                    {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
                  </div>
                  <button type="submit" className="btn btn-primary w-100 mb-2" disabled={loading}>{loading ? '登录中...' : '登录'}</button>
                </form>
                <button className="btn btn-outline-secondary w-100 mb-3" onClick={handleGuest} disabled={loading}>游客模式快速体验</button>
                <div className="text-center">
                  <span className="text-muted small">没有账号？</span>
                  <Link href="/auth/register" className="small">立即注册</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
