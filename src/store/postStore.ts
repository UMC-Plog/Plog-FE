import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CreatePostInput, Post } from '../types/post'

interface PostState {
  posts: Post[]
  createPost: (input: CreatePostInput) => Post
  getPostsByProjectId: (projectId: string) => Post[]
}

export const usePostStore = create<PostState>()(
  persist(
    (set, get) => ({
      posts: [],

      createPost: (input) => {
        const now = new Date().toISOString()
        const post: Post = {
          ...input,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          likeCount: 0,
          commentCount: 0,
        }

        set((state) => ({ posts: [post, ...state.posts] }))
        return post
      },

      getPostsByProjectId: (projectId) =>
        get()
          .posts.filter((post) => post.projectId === projectId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }),
    {
      name: 'plog-post-storage',
      partialize: (state) => ({ posts: state.posts }),
    }
  )
)
