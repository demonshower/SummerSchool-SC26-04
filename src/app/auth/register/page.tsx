'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { RegisterDto } from '@/types/auth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterDto>();

  const onSubmit = async (data: RegisterDto) => {
    setLoading(true); setError('');
    try {
      const res = await authApi.register(data);
      setAuth(res.accessToken, res.user);
      router.push('/trips');
    } catch (e: any) { setError(e.message || '注册失败'); } finally { setLoading(false); }
  };

  return (
    <>
      <Navbar />
      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-5">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h3 className="text-center mb-4"><i className="bi bi-person-plus me-2"></i>注册</h3>
                {error && <div className="alert alert-danger py-2 small">{error}</div>}
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="mb-3">
                    <label className="form-label">用户名</label>
                    <input {...register('username', { required: '请输入用户名', minLength: { value: 2, message: '至少2个字符' } })} className={`form-control ${errors.username ? 'is-invalid' : ''}`} placeholder="请输入用户名" />
                    {errors.username && <div className="invalid-feedback">{errors.username.message}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">邮箱（可选）</label>
                    <input type="email" {...register('email')} className="form-control" placeholder="请输入邮箱" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">密码</label>
                    <input type="password" {...register('password', { required: '请输入密码', minLength: { value: 6, message: '至少6个字符' } })} className={`form-control ${errors.password ? 'is-invalid' : ''}`} placeholder="请输入密码" />
                    {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
                  </div>
                  <button type="submit" className="btn btn-primary w-100 mb-3" disabled={loading}>{loading ? '注册中...' : '注册'}</button>
                </form>
                <div className="text-center">
                  <span className="text-muted small">已有账号？</span>
                  <Link href="/auth/login" className="small">立即登录</Link>
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
