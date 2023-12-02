const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')
const { v1: uuid } = require('uuid')
const { GraphQLError } = require('graphql')

const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
const Book = require('./models/Book')
const Author = require('./models/Author')

require('dotenv').config()

const MONGODB_URI = process.env.MONGODB_URI

console.log('connecting to', MONGODB_URI)

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })

const typeDefs = `
  type Book {
    title: String!
    published: Int!
    author: Author!
    id: ID!
    genres: [String!]!
  }

  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
  }

  type Mutation {
    addBook(
        title: String!
        author: String!
        published: Int!
        genres: [String!]!
    ): Book
    editAuthor(
        name: String!
        setBornTo: Int!
    ): Author
  }
`

const resolvers = {
  Query: {
    bookCount: async () => {
      return await Book.countDocuments()
    },
    authorCount: async () => {
      return await Author.countDocuments()
    },
    allBooks: async (root, args) => {
      let allBooksQuery = null  
      
      if (args.genre) {
            const genre = args.genre

            const booksByGenre = Book.find({ genres: genre })

            allBooksQuery = booksByGenre
        } else {
          allBooksQuery = Book.find()
        }
        
        return allBooksQuery
    },
    allAuthors: async () => {
      const allAuthors = await Author.find()

        return allAuthors
    }
  },
  Mutation: {
    addBook: async (root, args) => {
        const { author, ...bookWithoutAuthor } = args
        let authorObject = new Author({ name: args.author })

        const result = await Author.find({ name: authorObject.name })

        if (result.length === 0 ) {
          try {
            await authorObject.save()
          } catch(error) {
            throw new GraphQLError('Adding new Author failed', {
              extensions: {
                code: 'BAD_USER_INPUT',
                invalidArgs: args.name,
                error
              }
            })
          }
        } else if (result.length === 1) {
          authorObject = result[0]
        }

        const book = new Book({ ...bookWithoutAuthor, author: authorObject })

        try {
          await book.save()
        } catch(error) {
          throw new GraphQLError('Saving book failed', {
            extensions: {
              code: 'BAD_USER_INPUT',
              invalidArgs: args.name,
              error
            }
          })
        }

        return book
    },
    editAuthor: async (root, args) => {
        const result = await Author.find({ name: args.name})
        if (result.length === 0) {
            return null
        }
        const author = result[0]
        const updatedAuthor = new Author({ name: author.name, born: args.setBornTo, _id: author.id })

        try {
          await Author.findByIdAndUpdate(author.id, updatedAuthor)
        } catch(error) {
          throw new GraphQLError('Modyfing author failed', {
            extensions: {
              code: 'BAD_USER_INPUT',
              invalidArgs: args.name,
              error
            }
          })
        }

        return updatedAuthor
    }
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

startStandaloneServer(server, {
  listen: { port: 4000 },
}).then(({ url }) => {
  console.log(`Server ready at ${url}`)
})