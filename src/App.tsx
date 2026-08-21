import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import CapabilitiesProvider from './components/CapabilitiesProvider'
import Layout from './components/Layout'
import Home from './pages/Home'
import Movies from './pages/Movies'
import MovieDetail from './pages/MovieDetail'
import TVShows from './pages/TVShows'
import TVShowDetail from './pages/TVShowDetail'
import Music from './pages/Music'
import Books from './pages/Books'
import BookAuthor from './pages/BookAuthor'
import Comics from './pages/Comics'
import Audiobooks from './pages/Audiobooks'
import Player from './pages/Player'
import Search from './pages/Search'
import DiscoverDetail from './pages/DiscoverDetail'
import Favorites from './pages/Favorites'
import Settings from './pages/Settings'
import Queue from './pages/Queue'
import InProgress from './pages/InProgress'
import Collections from './pages/Collections'
import Upcoming from './pages/Upcoming'
import Playlists from './pages/Playlists'
import LiveTV from './pages/LiveTV'
import QuickConnect from './pages/QuickConnect'
import MusicArtist from './pages/MusicArtist'
import HomeVideos from './pages/HomeVideos'
import Mixed from './pages/Mixed'
import MusicVideos from './pages/MusicVideos'
import ForgotPassword from './pages/ForgotPassword'
import Studios from './pages/Studios'
import { applyTheme, getPreferences, pullUserdataFromServer } from './lib/userdata'
import { featureEnabled, libraryEnabled, useCapabilities } from './lib/capabilities'

function AppRoutes() {
  const { caps, loading } = useCapabilities()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-secondary)]">
        Loading your library…
      </div>
    )
  }

  return (
    <Routes>
      <Route path="player" element={<Player />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="discover/:type/:id" element={<DiscoverDetail />} />
        <Route path="favorites" element={<Favorites />} />
        {featureEnabled(caps, 'queue') && <Route path="queue" element={<Queue />} />}
        {featureEnabled(caps, 'request') && <Route path="requests" element={<InProgress />} />}
        {featureEnabled(caps, 'collections') && <Route path="collections" element={<Collections />} />}
        {featureEnabled(caps, 'upcoming') && <Route path="upcoming" element={<Upcoming />} />}
        {featureEnabled(caps, 'playlists') && <Route path="playlists" element={<Playlists />} />}
        {featureEnabled(caps, 'livetv') && <Route path="livetv" element={<LiveTV />} />}
        {featureEnabled(caps, 'quickconnect') && <Route path="quickconnect" element={<QuickConnect />} />}
        <Route path="settings" element={<Settings />} />
        <Route path="settings/profile" element={<Settings />} />
        <Route path="settings/display" element={<Settings />} />
        <Route path="settings/home" element={<Settings />} />
        <Route path="settings/playback" element={<Settings />} />
        <Route path="settings/subtitles" element={<Settings />} />
        <Route path="settings/controls" element={<Settings />} />
        {featureEnabled(caps, 'studios') && <Route path="studios" element={<Studios />} />}
        {libraryEnabled(caps, 'movies') && (
          <>
            <Route path="movies" element={<Movies />} />
            <Route path="movies/:id" element={<MovieDetail />} />
          </>
        )}
        {libraryEnabled(caps, 'tv') && (
          <>
            <Route path="tv" element={<TVShows />} />
            <Route path="tv/:id" element={<TVShowDetail />} />
          </>
        )}
        {libraryEnabled(caps, 'music') && (
          <>
            <Route path="music" element={<Music />} />
            <Route path="music/:id" element={<MusicArtist />} />
          </>
        )}
        {libraryEnabled(caps, 'homevideos') && <Route path="homevideos" element={<HomeVideos />} />}
        {featureEnabled(caps, 'mixed') && <Route path="mixed" element={<Mixed />} />}
        {libraryEnabled(caps, 'musicvideos') && <Route path="musicvideos" element={<MusicVideos />} />}
        {libraryEnabled(caps, 'books') && (
          <>
            <Route path="books" element={<Books />} />
            <Route path="books/:id" element={<BookAuthor />} />
          </>
        )}
        {libraryEnabled(caps, 'comics') && <Route path="comics" element={<Comics />} />}
        {libraryEnabled(caps, 'audiobooks') && <Route path="audiobooks" element={<Audiobooks />} />}
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  useEffect(() => {
    applyTheme(getPreferences().display.theme)
    void pullUserdataFromServer().then(() => {
      applyTheme(getPreferences().display.theme)
    })
  }, [])

  return (
    <CapabilitiesProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </CapabilitiesProvider>
  )
}
