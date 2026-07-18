'use client';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => { logout(); router.push('/auth/login'); };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top shadow-sm">
      <div className="container">
        <Link className="navbar-brand fw-bold" href="/"><i className="bi bi-airplane-engines me-2"></i>出差行程规划助手</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item"><Link className="nav-link" href="/"><i className="bi bi-house-door me-1"></i>首页</Link></li>
            {isAuthenticated && (
              <>
                <li className="nav-item"><Link className="nav-link" href="/trips/new"><i className="bi bi-plus-circle me-1"></i>新建行程</Link></li>
                <li className="nav-item"><Link className="nav-link" href="/trips"><i className="bi bi-clock-history me-1"></i>历史行程</Link></li>
              </>
            )}
          </ul>
          <div className="navbar-nav ms-2">
            {isAuthenticated ? (
              <div className="d-flex align-items-center gap-2">
                <span className="text-white-50 small"><i className="bi bi-person-circle me-1"></i>{user?.username}</span>
                <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>退出</button>
              </div>
            ) : (
              <Link className="btn btn-outline-light btn-sm" href="/auth/login">登录</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
