import { useState } from 'react'
import { useMutation } from '@apollo/client'

import { ALL_AUTHORS, EDIT_AUTHOR } from '../queries'

const AuthorSetBirthyear = ({ authors }) => {
    const [born, setBorn] = useState('')
    const [selectedAuthor, setSelectedAuthor] = useState(null)
    
    const [ changeBirthyear, result ] = useMutation(EDIT_AUTHOR, {
        refetchQueries: [{ query: ALL_AUTHORS }],
    })

    const submit = (event) => {
        event.preventDefault()

        const bornInt = parseInt(born)

        changeBirthyear({ variables: { name: selectedAuthor, setBornTo: bornInt } })

        setBorn('')
    }
    
    return (
      <div>
        <h2>Set Birthyear</h2>
        <form onSubmit={submit}>
        <div>
            <label>
                name
                <select name="selectedAuthor"
                    onChange={({ target }) => setSelectedAuthor(target.value)}
                >
                    {authors.map((a) => (
                        <option key={a.name} value={a.name}>{a.name}</option>
                    ))}
                </select>
            </label>
        </div>
        <div>
            born <input value={born}
                onChange={({ target }) => setBorn(target.value)}
            />
        </div>
        <button type='submit'>update author</button>
        </form>
      </div>
    )
  }

export default AuthorSetBirthyear