'use client';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      <Navbar />
      <main>
        <div className="row min-vh-75">
          <div className="col-12 text-center py-5">
            <h1 className="display-4 fw-bold text-primary mb-3"><i className="bi bi-compass"></i> 出差行程规划助手</h1>
            <p className="lead text-muted mb-4 mx-auto" style={{ maxWidth: 600 }}>只需填写出差信息，系统自动为您推荐交通、酒店和景点，生成完整的每日行程与预算分析。</p>
            <div className="d-flex justify-content-center gap-3 mb-5">
              <Link href={isAuthenticated ? '/trips/new' : '/auth/login'} className="btn btn-primary btn-lg px-4"><i className="bi bi-plus-circle me-2"></i>开始规划</Link>
              <Link href={isAuthenticated ? '/trips' : '/auth/login'} className="btn btn-outline-primary btn-lg px-4"><i className="bi bi-clock-history me-2"></i>历史行程</Link>
            </div>
          </div>
          <div className="col-12">
            <div className="row g-4">
              {[
                { icon: 'bi-calendar-check', color: 'primary', title: '会议时间分析', desc: '支持多场会议，自动划分出发日、会议日、游玩日和返程日' },
                { icon: 'bi-geo-alt', color: 'success', title: '智能推荐', desc: '根据空闲时间和偏好，智能推荐景点和餐饮' },
                { icon: 'bi-wallet2', color: 'warning', title: '预算统计', desc: '自动汇总各项费用，实时提示预算状态' },
              ].map((f, i) => (
                <div className="col-md-4" key={i}>
                  <div className="card border-primary h-100 shadow-sm">
                    <div className="card-body text-center p-4">
                      <div className={`display-6 text-${f.color} mb-3`}><i className={`bi ${f.icon}`}></i></div>
                      <h5 className="card-title">{f.title}</h5>
                      <p className="card-text text-muted">{f.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
