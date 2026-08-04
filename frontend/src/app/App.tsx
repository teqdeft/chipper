import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ScrollToTop from '@/components/layout/ScrollToTop';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { ToastProvider } from '@/app/providers/ToastProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import RequireAccess, { RequireGuest } from '@/components/routing/RequireAccess';
import MarketingLayout from '@/components/layout/shells/MarketingLayout';
import AuthLayout from '@/components/layout/shells/AuthLayout';
import AppLayout from '@/components/layout/shells/AppLayout';
import AdminLayout from '@/components/layout/shells/AdminLayout';
import HomePage from '@/pages/HomePage';
import AboutPage from '@/pages/public/AboutPage';
import HowItWorksPage from '@/pages/public/HowItWorksPage';
import NewsListPage from '@/pages/public/NewsListPage';
import NewsDetailPage from '@/pages/public/NewsDetailPage';
import PrivacyPage from '@/pages/public/PrivacyPage';
import TermsPage from '@/pages/public/TermsPage';
import LicensesPage from '@/pages/public/LicensesPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import LoginPage from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';
import ProfileEditPage from '@/pages/settings/ProfileEditPage';
import AccountSettingsPage from '@/pages/settings/AccountSettingsPage';
import PublicProfilePage from '@/pages/settings/PublicProfilePage';
import MembersPage from '@/pages/members/MembersPage';
import DesignsBrowsePage from '@/pages/designs/DesignsBrowsePage';
import DesignDetailPage from '@/pages/designs/DesignDetailPage';
import DesignViewerPage from '@/pages/designs/DesignViewerPage';
import DownloadGatePage from '@/pages/designs/DownloadGatePage';
import UploadWizardPage from '@/pages/upload/UploadWizardPage';
import MyDesignsPage from '@/pages/upload/MyDesignsPage';
import EditDesignPage from '@/pages/upload/EditDesignPage';
import NewVersionPage from '@/pages/upload/NewVersionPage';
import ForumHomePage from '@/pages/forum/ForumHomePage';
import ForumCategoryPage from '@/pages/forum/ForumCategoryPage';
import ForumThreadPage from '@/pages/forum/ForumThreadPage';
import ForumNewTopicPage from '@/pages/forum/ForumNewTopicPage';
import ForumSearchPage from '@/pages/forum/ForumSearchPage';
import InboxPage from '@/pages/messages/InboxPage';
import ConversationPage from '@/pages/messages/ConversationPage';
import NotificationsPage from '@/pages/messages/NotificationsPage';
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminDesignsPage from '@/pages/admin/AdminDesignsPage';
import AdminModerationPage from '@/pages/admin/AdminModerationPage';
import AdminCommentsPage from '@/pages/admin/AdminCommentsPage';
import AdminNewsPage from '@/pages/admin/AdminNewsPage';
import AdminForumPage from '@/pages/admin/AdminForumPage';
import NotFoundPage from '@/pages/NotFoundPage';

/**
 * Route table.
 *
 * Access follows the "Roles" column of the Screen Inventory. Screens marked
 * "All" are plain routes; anything narrower is wrapped in <RequireAccess> with
 * the matching key from SCREEN_ACCESS, so a route always traces back to its
 * SCR-xxx row. The API enforces the same rules, so these guards shape
 * navigation, not security.
 */
export default function App() {
  return (
    <BrowserRouter>
      {/* ToastProvider sits above AuthProvider so a session-expiry notice can be
          raised while auth state is still resolving. */}
      <ToastProvider>
        <AuthProvider>
          <ScrollToTop />
          <ErrorBoundary>
            <Routes>
              {/* ── Public marketing — SCR-001..008, all roles ─────────────── */}
              <Route element={<MarketingLayout />}>
                <Route index element={<HomePage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="how-it-works" element={<HowItWorksPage />} />
                <Route path="news" element={<NewsListPage />} />
                <Route path="news/:slug" element={<NewsDetailPage />} />
                <Route path="privacy" element={<PrivacyPage />} />
                <Route path="terms" element={<TermsPage />} />
                <Route path="licenses" element={<LicensesPage />} />
              </Route>

              {/* ── Auth — SCR-009..013 ─────────────────────────────────────
                  Sign-in and sign-up are guest-only: a signed-in user landing
                  there is bounced back to where they came from. Recovery and
                  verification stay open to everyone — those links arrive by
                  email and must work whatever the browser's session state is. */}
              <Route element={<AuthLayout />}>
                <Route element={<RequireGuest />}>
                  <Route path="register" element={<RegisterPage />} />
                  <Route path="login" element={<LoginPage />} />
                </Route>
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
                <Route path="verify-email" element={<VerifyEmailPage />} />
              </Route>

              <Route element={<AppLayout />}>
                {/* ── Design library — SCR-017..019 public ─────────────────── */}
                <Route path="designs" element={<DesignsBrowsePage />} />
                <Route path="designs/:id" element={<DesignDetailPage />} />
                <Route path="designs/:id/view" element={<DesignViewerPage />} />

                {/* SCR-020 — security-critical: the download identifies the user */}
                <Route element={<RequireAccess screen="designs/download" />}>
                  <Route path="designs/:id/download" element={<DownloadGatePage />} />
                </Route>

                {/* ── Upload & manage — SCR-021..023, Uploader+ ────────────── */}
                <Route element={<RequireAccess screen="upload" />}>
                  <Route path="upload" element={<UploadWizardPage />} />
                </Route>
                <Route element={<RequireAccess screen="my-designs" />}>
                  <Route path="my-designs" element={<MyDesignsPage />} />
                </Route>
                <Route element={<RequireAccess screen="my-designs/edit" />}>
                  <Route path="my-designs/:id/edit" element={<EditDesignPage />} />
                </Route>
                <Route element={<RequireAccess screen="my-designs/new-version" />}>
                  <Route path="my-designs/:id/new-version" element={<NewVersionPage />} />
                </Route>

                {/* ── Forum — SCR-024..028 readable by all, posting is User+ ─ */}
                <Route path="forum" element={<ForumHomePage />} />
                <Route path="forum/search" element={<ForumSearchPage />} />
                <Route element={<RequireAccess screen="forum/new" />}>
                  <Route path="forum/new" element={<ForumNewTopicPage />} />
                </Route>
                <Route path="forum/:category" element={<ForumCategoryPage />} />
                <Route path="forum/t/:id" element={<ForumThreadPage />} />

                {/* ── Messaging & notifications — SCR-029..031, User+ ──────── */}
                <Route element={<RequireAccess screen="messages" />}>
                  <Route path="messages" element={<InboxPage />} />
                </Route>
                <Route element={<RequireAccess screen="messages/conversation" />}>
                  <Route path="messages/:id" element={<ConversationPage />} />
                </Route>
                <Route element={<RequireAccess screen="notifications" />}>
                  <Route path="notifications" element={<NotificationsPage />} />
                </Route>

                {/* ── Account — SCR-014, SCR-015, User+ ────────────────────── */}
                <Route element={<RequireAccess screen="settings/profile" />}>
                  <Route path="settings/profile" element={<ProfileEditPage />} />
                </Route>
                <Route element={<RequireAccess screen="settings/account" />}>
                  <Route path="settings/account" element={<AccountSettingsPage />} />
                </Route>

                {/* Member directory — signed-in only, unlike the profiles it links to */}
                <Route element={<RequireAccess screen="members" />}>
                  <Route path="members" element={<MembersPage />} />
                </Route>

                {/* SCR-016 — public profile, all roles */}
                <Route path="u/:handle" element={<PublicProfilePage />} />
              </Route>

              {/* ── Admin — SCR-032..038, per-screen capability ─────────────
                  The console has its own entrance at /admin/login; the guard
                  redirects unauthenticated visits to it. Outside the layout so
                  the sign-in page has no admin chrome. */}
              <Route path="admin/login" element={<AdminLoginPage />} />

              <Route path="admin" element={<AdminLayout />}>
                <Route element={<RequireAccess screen="admin" />}>
                  <Route index element={<AdminDashboardPage />} />
                </Route>
                <Route element={<RequireAccess screen="admin/users" />}>
                  <Route path="users" element={<AdminUsersPage />} />
                </Route>
                <Route element={<RequireAccess screen="admin/designs" />}>
                  <Route path="designs" element={<AdminDesignsPage />} />
                </Route>
                <Route element={<RequireAccess screen="admin/moderation" />}>
                  <Route path="moderation" element={<AdminModerationPage />} />
                </Route>
                <Route element={<RequireAccess screen="admin/comments" />}>
                  <Route path="comments" element={<AdminCommentsPage />} />
                </Route>
                <Route element={<RequireAccess screen="admin/news" />}>
                  <Route path="news" element={<AdminNewsPage />} />
                </Route>
                <Route element={<RequireAccess screen="admin/forum" />}>
                  <Route path="forum" element={<AdminForumPage />} />
                </Route>
              </Route>

              {/* ── System — SCR-040 ─────────────────────────────────────── */}
              <Route path="404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
