import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CreateCommentInput, CreatePostInput, Post, PostComment } from '../types/post'

interface PostState {
  posts: Post[]
  comments: PostComment[]
  createPost: (input: CreatePostInput) => Post
  getPostsByProjectId: (projectId: string) => Post[]
  getPostById: (projectId: string, postId: string) => Post | undefined
  updatePost: (
    projectId: string,
    postId: string,
    updates: Pick<Post, 'title' | 'content' | 'attachments'>
  ) => Post | undefined
  deletePost: (projectId: string, postId: string) => void
  addComment: (
    projectId: string,
    input: CreateCommentInput
  ) => PostComment | undefined
  getCommentsByPostId: (projectId: string, postId: string) => PostComment[]
  togglePostLike: (projectId: string, postId: string, userId: string) => void
  isPostLikedByUser: (projectId: string, postId: string, userId: string) => boolean
}

export const usePostStore = create<PostState>()(
  persist(
    (set, get) => ({
      posts: [],
      comments: [],

      createPost: (input) => {
        const now = new Date().toISOString()
        const post: Post = {
          ...input,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          likeCount: 0,
          commentCount: 0,
          likedUserIds: [],
        }

        set((state) => ({ posts: [post, ...state.posts] }))
        return post
      },

      getPostsByProjectId: (projectId) =>
        get()
          .posts.filter((post) => post.projectId === projectId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

      getPostById: (projectId, postId) =>
        get().posts.find((post) => post.id === postId && post.projectId === projectId),

      updatePost: (projectId, postId, updates) => {
        let updatedPost: Post | undefined

        set((state) => ({
          posts: state.posts.map((post) => {
            if (post.id !== postId || post.projectId !== projectId) return post

            updatedPost = {
              ...post,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
            return updatedPost
          }),
        }))

        return updatedPost
      },

      deletePost: (projectId, postId) =>
        set((state) => {
          const targetExists = state.posts.some(
            (post) => post.id === postId && post.projectId === projectId
          )
          if (!targetExists) return state

          return {
            posts: state.posts.filter(
              (post) => post.id !== postId || post.projectId !== projectId
            ),
            comments: state.comments.filter((comment) => comment.postId !== postId),
          }
        }),

      addComment: (projectId, input) => {
        if (!input.content.trim()) return undefined
        const targetExists = get().posts.some(
          (post) => post.id === input.postId && post.projectId === projectId
        )
        if (!targetExists) return undefined

        const comment: PostComment = {
          ...input,
          content: input.content.trim(),
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }

        set((state) => {
          const comments = [...state.comments, comment]
          return {
            comments,
            posts: state.posts.map((post) =>
              post.id === input.postId && post.projectId === projectId
                ? {
                    ...post,
                    commentCount: comments.filter(
                      (item) => item.postId === input.postId
                    ).length,
                  }
                : post
            ),
          }
        })
        return comment
      },

      getCommentsByPostId: (projectId, postId) => {
        const postExists = get().posts.some(
          (post) => post.id === postId && post.projectId === projectId
        )
        if (!postExists) return []

        return get()
          .comments.filter((comment) => comment.postId === postId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      },

      togglePostLike: (projectId, postId, userId) =>
        set((state) => ({
          posts: state.posts.map((post) => {
            if (post.id !== postId || post.projectId !== projectId) return post

            const likedUserIds = post.likedUserIds ?? []
            const nextLikedUserIds = likedUserIds.includes(userId)
              ? likedUserIds.filter((id) => id !== userId)
              : [...likedUserIds, userId]

            return {
              ...post,
              likedUserIds: nextLikedUserIds,
              likeCount: nextLikedUserIds.length,
            }
          }),
        })),

      isPostLikedByUser: (projectId, postId, userId) => {
        const post = get().posts.find(
          (item) => item.id === postId && item.projectId === projectId
        )
        return Boolean(post?.likedUserIds?.includes(userId))
      },
    }),
    {
      name: 'plog-post-storage',
      partialize: (state) => ({ posts: state.posts, comments: state.comments }),
    }
  )
)
