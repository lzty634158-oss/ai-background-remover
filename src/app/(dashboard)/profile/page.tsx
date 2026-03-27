'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { Card } from '@/components/ui';
import { getUser, getToken, updateProfile, changePassword, type User } from '@/lib/auth';
import { translations, type Lang, type Translation } from '@/lib/translations';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lang, setLang] = useState<Lang>('zh');
  const [t, setT] = useState<Translation>(translations.zh);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // 是否是 OAuth 用户（无密码）
  const isOAuthUser = !user?.hasPassword;

  useEffect(() => {
    const savedLang = (localStorage.getItem('lang') as Lang) || 'zh';
    setLang(savedLang);
    setT(translations[savedLang]);
  }, []);

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    setT(translations[newLang]);
    localStorage.setItem('lang', newLang);
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    getUser(token).then((res) => {
      if (res.success && res.user) {
        setUser(res.user);
        setName(res.user.name || '');
        setBio(res.user.bio || '');
        setPhone(res.user.phone || '');
        setAvatarUrl(res.user.avatar_url || '');
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
      setLoading(false);
    });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleSave = async () => {
    const token = getToken();
    if (!token) return;

    setSaving(true);
    setMessage(null);

    const res = await updateProfile(token, {
      name: name.trim() || undefined,
      bio: bio.trim() || undefined,
      phone: phone.trim() || undefined,
      avatar_url: avatarUrl.trim() || undefined,
    });

    setSaving(false);

    if (res.success) {
      setMessage({ type: 'success', text: t.profileSaved });
      if (res.user) setUser(res.user);
    } else {
      const errMsg = res.message !== undefined ? res.message : t.profileSaveFailed;
      setMessage({ type: 'error', text: errMsg });
    }
  };

  const handleChangePassword = async () => {
    const token = getToken();
    if (!token) return;

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: t.passwordTooShort ?? "Password must be at least 6 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: t.passwordMismatch ?? "Passwords do not match" });
      return;
    }

    setChangingPassword(true);
    setPasswordMsg(null);

    const res = await changePassword(token, isOAuthUser ? '' : currentPassword, newPassword);

    setChangingPassword(false);

    if (res.success) {
      setPasswordMsg({ type: 'success', text: t.passwordChanged ?? "Password updated successfully!" });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } else {
      setPasswordMsg({ type: 'error', text: (res.message || t.passwordChangeFailed) ?? "Failed to change password" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalQuota = (user?.freeQuota || 0) + (user?.paidCredits || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <AppHeader
        lang={lang}
        onLangChange={handleLangChange}
        t={t}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{t.personalCenter}</h1>
          <p className="text-gray-400 mt-1">{t.profileInfo}</p>
        </div>

        {/* Profile Card */}
        <Card className="bg-gray-800/60 border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {t.profileInfo}
          </h2>

          {/* Avatar Preview */}
          <div className="flex items-center gap-4 mb-6">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-violet-500"
                onError={() => setAvatarUrl('')}
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold border-2 border-violet-500">
                {name ? name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div>
              <p className="text-white font-medium">{t.profilePhoto}</p>
              {avatarUrl && <p className="text-gray-400 text-sm mt-0.5">{t.enterAvatarUrl}</p>}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.email}</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">{t.emailCannotChange}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.displayName}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder={t.enterDisplayName}
                className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.avatarUrl}</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                maxLength={500}
                placeholder={t.enterAvatarUrl}
                className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.phone}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
                placeholder={t.enterPhone}
                className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.bio}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder={t.tellAboutYourself}
                className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{bio.length}{t.bioLength}</p>
            </div>
          </div>

          {message && (
            <div className={`mt-4 px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {message.text}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.saving}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t.saveChanges}
                </>
              )}
            </button>
            <div className="text-sm text-gray-500">
              {t.memberSince}: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : lang === 'ko' ? 'ko-KR' : undefined) : 'N/A'}
            </div>
          </div>
        </Card>

        {/* Account Stats */}
        <Card className="bg-gray-800/60 border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t.accountOverview}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-white">{totalQuota}</p>
              <p className="text-gray-400 text-xs mt-1">{t.totalCredits}</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-violet-400">{user?.freeQuota ?? 0}</p>
              <p className="text-gray-400 text-xs mt-1">{t.remainingQuota}</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{user?.paidCredits ?? 0}</p>
              <p className="text-gray-400 text-xs mt-1">{t.remainingCredits}</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-indigo-400">{user?.totalUsed ?? 0}</p>
              <p className="text-gray-400 text-xs mt-1">{t.imagesUsed}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => router.push('/login-history')}
              className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded-lg text-gray-300 text-sm transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.loginHistory}
            </button>
            <button
              onClick={() => router.push('/history')}
              className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded-lg text-gray-300 text-sm transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t.processingHistory}
            </button>
          </div>
        </Card>

        {/* Security Settings */}
        <Card className="bg-gray-800/60 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {t.securitySettings}
            </h2>
            {!showPasswordSection && (
              <button
                onClick={() => setShowPasswordSection(true)}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded-lg text-gray-300 text-sm transition-colors"
              >
                {isOAuthUser ? (t.setPassword ?? '设置密码') : t.changePassword}
              </button>
            )}
          </div>

          {!showPasswordSection ? (
            <div className="flex items-center gap-3 text-gray-400 text-sm">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isOAuthUser ? t.passwordNotSet ?? 'Password not set — click to set one' : t.passwordProtected}
            </div>
          ) : (
            <div className="space-y-4">
              {!isOAuthUser && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.currentPassword}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t.enterCurrentPassword}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                />
              </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.newPassword}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.enterNewPassword}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">{t.confirmNewPassword}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.enterConfirmPassword}
                  className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                />
              </div>

              {passwordMsg && (
                <div className={`px-4 py-3 rounded-lg text-sm ${passwordMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {passwordMsg.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center gap-2"
                >
                  {changingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t.saving}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t.savePassword}
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordSection(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordMsg(null);
                  }}
                  className="px-6 py-2.5 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded-lg text-gray-300 font-medium transition-colors"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
