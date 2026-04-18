'use client'

import {
  Header,
  Navigation,
  ToastNotification,
  DashboardTab,
  AuthTab,
  ImagesTab,
  QuizzesTab,
  JobsTab,
  Insights,
  ResponseDisplay,
} from '@/components'
import { useAppState } from '@/hooks'
import { TAB_IDS } from '@/lib/constants'

export default function Page() {
  const state = useAppState()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        health={state.health}
        backendUrl={state.backendUrl}
        apiKey={state.apiKey}
        onBackendUrlChange={state.setBackendUrl}
        onApiKeyChange={state.setApiKey}
      />

      <Navigation activeTab={state.activeTab} onTabChange={state.setActiveTab} />

      <main className="mx-auto grid w-full max-w-7xl gap-5 p-5">
        {state.activeTab === TAB_IDS.DASHBOARD && (
          <DashboardTab healthLabel={state.healthLabel} quickStats={state.quickStats} />
        )}

        {state.activeTab === TAB_IDS.AUTH && (
          <AuthTab
            authData={state.authData}
            loading={state.loading}
            onAuthDataChange={state.setAuthData}
            onSignIn={state.signIn}
          />
        )}

        {state.activeTab === TAB_IDS.IMAGES && (
          <ImagesTab
            imagesLimit={state.imagesLimit}
            imagesCursor={state.imagesCursor}
            imageFile={state.imageFile}
            images={state.images}
            activeImage={state.activeImage}
            loading={state.loading}
            onImagesLimitChange={state.setImagesLimit}
            onImagesCursorChange={state.setImagesCursor}
            onImageFileChange={state.setImageFile}
            onUploadSingle={state.uploadSingleImage}
            onUploadMany={state.uploadMany}
            onFetchImages={state.fetchImages}
            onDeleteActiveImage={state.deleteActiveImage}
            onCarouselPrev={state.prev}
            onCarouselNext={state.next}
          />
        )}

        {state.activeTab === TAB_IDS.QUIZZES && (
          <QuizzesTab
            quizzes={state.quizzes}
            delayMs={state.delayMs}
            retryWrongAfterMinutes={state.retryWrongAfterMinutes}
            loading={state.loading}
            onQuizzesChange={state.setQuizzes}
            onDelayChange={state.setDelayMs}
            onRetryWrongAfterMinutesChange={state.setRetryWrongAfterMinutes}
            onSend={state.sendQuizzes}
          />
        )}

        {state.activeTab === TAB_IDS.JOBS && (
          <JobsTab
            jobId={state.jobId}
            jobStatus={state.jobStatus}
            loading={state.loading}
            onJobIdChange={state.setJobId}
            onCheckJob={state.checkJob}
          />
        )}

        <Insights insights={state.insights} />

        <ResponseDisplay meta={state.latestMeta} response={state.latestResponse} />
      </main>

      <ToastNotification toast={state.toast} />
    </div>
  )
}