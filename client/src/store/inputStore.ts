import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface InputStore {
  // State to track if there's any active input happening in the app
  isInputActive: boolean
  
  // Actions
  setInputActive: (isActive: boolean) => void
}

export const useInputStore = create<InputStore>()(
  devtools(
    (set) => ({
      // Initial state
      isInputActive: false,
      
      // Actions
      setInputActive: (isActive) => set({ isInputActive: isActive }),
    }),
    {
      name: 'input-store',
    }
  )
)