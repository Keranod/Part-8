import { useQuery } from "@apollo/client"
import { useEffect, useState } from 'react'

import { ALL_BOOKS } from "../queries"

const Books = (props) => {
  const [selectedGenre, setselectedGenre] = useState("")
  const [booksGenres, setBooksGenres] = useState([])
  const result = useQuery(ALL_BOOKS, {
    variables: { genre: selectedGenre }
  })

  if (!props.show) {
    return null
  }

  if (result.loading) {
    return <div>loading...</div>
  }

  const books = result.data.allBooks

  books.forEach((book) => {
    book.genres.forEach((genre) => {
      if (!booksGenres.includes(genre)) {
        setBooksGenres(booksGenres.concat(genre))
      }
    })
  })

  return (
    <div>
      <h2>books</h2>

      <p>in genre <b>{selectedGenre}</b></p>

      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {books.map((a) => (
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <select name="genres"
                    onChange={({ target }) => setselectedGenre(target.value)}
                >
                    <option value="">choose genre</option>
                    {booksGenres.map((a) => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
    </div>
  )
}

export default Books
