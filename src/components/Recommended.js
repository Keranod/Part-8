import { useQuery } from "@apollo/client"
import { useEffect, useState } from 'react'

import { ALL_BOOKS, CURRENT_USER } from "../queries"

const Recommended = (props) => {
  const [favoriteGenre, setfavoriteGenre] = useState("")
  const userResult = useQuery(CURRENT_USER)
  
  const result = useQuery(ALL_BOOKS, {
    variables: { genre: favoriteGenre }
  })

  useEffect(() => {
    if (userResult.data && userResult.data.me) {
        setfavoriteGenre(userResult.data.me.favoriteGenre);
    }
  }, [userResult.data])

  if (!props.show) {
    return null
  }

  if (userResult.loading) {
    return <div>logged user info loading...</div>
  }

  if (result.loading) {
    return <div>loading...</div>
  }

  const books = result.data.allBooks

  return (
    <div>
      <h2>recommendations</h2>

        <p>books in your favorite genre <b>{favoriteGenre}</b></p>

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
    </div>
  )
}

export default Recommended
