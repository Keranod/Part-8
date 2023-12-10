const { GraphQLError } = require('graphql')
const Book = require('./models/Book')
const Author = require('./models/Author')
const User = require('./models/User')
const { PubSub } = require('graphql-subscriptions')
const pubsub = new PubSub()

const jwt = require('jsonwebtoken')

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
        const allBooks = await Book.find()

        const authorBookCounts = allAuthors.reduce((counts, author) => {
          const authorBookCount = allBooks.filter(book => book.author.toString() === author._id.toString()).length
          
          counts.push({
            ...author.toObject(),
            bookCount: authorBookCount,
          })
    
          return counts
        }, [])
    
        return authorBookCounts
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
  
          pubsub.publish('BOOK_ADDED', { bookAdded: book })

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
      }
    },
    Subscription: {
        bookAdded: {
            subscribe: () => pubsub.asyncIterator('BOOK_ADDED')
        }
      }
  }

  module.exports = resolvers