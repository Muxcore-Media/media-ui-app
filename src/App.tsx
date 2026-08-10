import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Movies from './pages/Movies'
import MovieDetail from './pages/MovieDetail'
import TVShows from './pages/TVShows'
import TVShowDetail from './pages/TVShowDetail'
import Music from './pages/Music'
import Books from './pages/Books'
import Comics from './pages/Comics'
import Audiobooks from './pages/Audiobooks'
import Player from './pages/Player'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="movies" element={<Movies />} />
          <Route path="movies/:id" element={<MovieDetail />} />
          <Route path="tv" element={<TVShows />} />
          <Route path="tv/:id" element={<TVShowDetail />} />
          <Route path="music" element={<Music />} />
          <Route path="books" element={<Books />} />
          <Route path="comics" element={<Comics />} />
          <Route path="audiobooks" element={<Audiobooks />} />
          <Route path="player" element={<Player />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
