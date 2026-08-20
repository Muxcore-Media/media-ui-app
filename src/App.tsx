import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
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
import Favorites from './pages/Favorites'
import Settings from './pages/Settings'
import Queue from './pages/Queue'
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

export default function App() {
  useEffect(() => {
    applyTheme(getPreferences().display.theme)
    void pullUserdataFromServer().then(() => {
      applyTheme(getPreferences().display.theme)
    })
  }, [])

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="queue" element={<Queue />} />
          <Route path="collections" element={<Collections />} />
          <Route path="upcoming" element={<Upcoming />} />
          <Route path="playlists" element={<Playlists />} />
          <Route path="livetv" element={<LiveTV />} />
          <Route path="quickconnect" element={<QuickConnect />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/profile" element={<Settings />} />
          <Route path="settings/display" element={<Settings />} />
          <Route path="settings/home" element={<Settings />} />
          <Route path="settings/playback" element={<Settings />} />
          <Route path="settings/subtitles" element={<Settings />} />
          <Route path="settings/controls" element={<Settings />} />
          <Route path="studios" element={<Studios />} />
          <Route path="movies" element={<Movies />} />
          <Route path="movies/:id" element={<MovieDetail />} />
          <Route path="tv" element={<TVShows />} />
          <Route path="tv/:id" element={<TVShowDetail />} />
          <Route path="music" element={<Music />} />
          <Route path="music/:id" element={<MusicArtist />} />
          <Route path="homevideos" element={<HomeVideos />} />
          <Route path="mixed" element={<Mixed />} />
          <Route path="musicvideos" element={<MusicVideos />} />
          <Route path="books" element={<Books />} />
          <Route path="books/:id" element={<BookAuthor />} />
          <Route path="comics" element={<Comics />} />
          <Route path="audiobooks" element={<Audiobooks />} />
          <Route path="player" element={<Player />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
