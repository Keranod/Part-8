const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')
const { v1: uuid } = require('uuid')
const { GraphQLError } = require('graphql')

const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
const Book = require('./models/Book')
const Author = require('./models/Author')
const User = require('./models/User')

const jwt = require('jsonwebtoken')

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

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }
  
  type Token {
    value: String!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    me: User
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
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
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
      try {
        let allBooksQuery = null
    
        if (args.genre) {
          const genre = args.genre
          const booksByGenre = await Book.find({ genres: genre })
          allBooksQuery = booksByGenre
        } else {
          allBooksQuery = await Book.find()
        }
    
        const booksWithAuthors = await Promise.all(
          allBooksQuery.map(async (book) => {
            const author = await Author.findById(book.author)
            return {
              title: book.title,
              published: book.published,
              genres: book.genres,
              author: author ? { name: author.name } : null,
            };
          })
        );
    
        return booksWithAuthors
      } catch (error) {
        console.error("Error in allBooks resolver:", error)
        throw new Error("Internal server error")
      }
    },
    allAuthors: async () => {
      const allAuthors = await Author.find()

        return allAuthors
    },
    me: (root, args, context) => {
      return context.currentUser
    }    
  },
  Mutation: {
    addBook: async (root, args, context) => {
        const { author, ...bookWithoutAuthor } = args

        const currentUser = context.currentUser

        if (!currentUser) {
          throw new GraphQLError('not authenticated', {
            extensions: {
              code: 'BAD_USER_INPUT',
            }
          })
        }

        let authorObject = new Author({ name: args.author })

        const result = await Author.find({ name: authorObject.name })

        if (result.length === 0 ) {
          try {
            await authorObject.save()
            await currentUser.save()
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
          await currentUser.save()
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
    editAuthor: async (root, args, context) => {
        const currentUser = context.currentUser

        if (!currentUser) {
          throw new GraphQLError('not authenticated', {
            extensions: {
              code: 'BAD_USER_INPUT',
            }
          })
        }

        const result = await Author.find({ name: args.name})
        if (result.length === 0) {
            return null
        }
        const author = result[0]
        const updatedAuthor = new Author({ name: author.name, born: args.setBornTo, _id: author.id })

        try {
          await Author.findByIdAndUpdate(author.id, updatedAuthor)
          await currentUser.save()
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
    },
    createUser: async (root, args) => {
      const user = new User({ username: args.username, favoriteGenre: args.favoriteGenre })
  
      return user.save()
        .catch(error => {
          throw new GraphQLError('Creating the user failed', {
            extensions: {
              code: 'BAD_USER_INPUT',
              invalidArgs: args.username,
              error
            }
          })
        })
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })
  
      if ( !user || args.password !== 'secret' ) {
        throw new GraphQLError('wrong credentials', {
          extensions: {
            code: 'BAD_USER_INPUT'
          }
        })        
      }
  
      const userForToken = {
        username: user.username,
        id: user._id,
      }
  
      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) }
    },
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req, res }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.startsWith('Bearer ')) {
      const decodedToken = jwt.verify(
        auth.substring(7), process.env.JWT_SECRET
      )
      const currentUser = await User
        .findById(decodedToken.id)
      return { currentUser }
    }
  },
}).then(({ url }) => {
  console.log(`Server ready at ${url}`)
})