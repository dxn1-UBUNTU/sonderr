---
name: data-structures-algorithms
description: Data structures and algorithms patterns. Covers arrays, trees, graphs, dynamic programming, sorting, and searching. Use for algorithm-heavy problems and interview prep.
---

# Data Structures & Algorithms Mastery

## Big O Cheat Sheet

```
Time Complexity:
  O(1)        — Hash map lookup, array index access
  O(log n)    — Binary search, balanced BST operations
  O(n)        — Linear scan, single loop
  O(n log n)  — Merge sort, heap sort, efficient sorts
  O(n²)       — Nested loops, bubble sort
  O(2^n)      — Subsets, recursive Fibonacci
  O(n!)       — Permutations, traveling salesman

Space Complexity:
  O(1)        — Constant extra space
  O(n)        — Array of size n, recursion stack
  O(n²)       — 2D matrix
  O(log n)    — Balanced recursion depth
```

## Arrays & Hashing

```typescript
// Two Sum — O(n) with hash map
function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>()
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i]
    if (map.has(complement)) return [map.get(complement)!, i]
    map.set(nums[i], i)
  }
  return []
}

// Group Anagrams — O(n * k log k)
function groupAnagrams(strs: string[]): string[][] {
  const map = new Map<string, string[]>()
  for (const str of strs) {
    const key = str.split("").sort().join("")
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(str)
  }
  return [...map.values()]
}

// Top K Frequent — O(n) with bucket sort
function topKFrequent(nums: number[], k: number): number[] {
  const freq = new Map<number, number>()
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1)

  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => [])
  for (const [num, count] of freq) buckets[count].push(num)

  const result: number[] = []
  for (let i = buckets.length - 1; i >= 0 && result.length < k; i--) {
    for (const num of buckets[i]) {
      result.push(num)
      if (result.length === k) break
    }
  }
  return result
}

// Longest Consecutive Sequence — O(n)
function longestConsecutive(nums: number[]): number {
  const set = new Set(nums)
  let maxLen = 0
  for (const num of set) {
    if (!set.has(num - 1)) {  // Start of sequence
      let current = num
      let len = 1
      while (set.has(current + 1)) { current++; len++ }
      maxLen = Math.max(maxLen, len)
    }
  }
  return maxLen
}
```

## Two Pointers

```typescript
// Valid Palindrome — O(n)
function isPalindrome(s: string): boolean {
  let left = 0, right = s.length - 1
  while (left < right) {
    while (left < right && !isAlphaNum(s[left])) left++
    while (left < right && !isAlphaNum(s[right])) right--
    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false
    left++; right--
  }
  return true
}

// Trapping Rain Water — O(n)
function trap(height: number[]): number {
  let left = 0, right = height.length - 1
  let leftMax = 0, rightMax = 0
  let water = 0

  while (left < right) {
    if (height[left] < height[right]) {
      height[left] >= leftMax ? leftMax = height[left] : water += leftMax - height[left]
      left++
    } else {
      height[right] >= rightMax ? rightMax = height[right] : water += rightMax - height[right]
      right--
    }
  }
  return water
}

// Container With Most Water — O(n)
function maxArea(height: number[]): number {
  let left = 0, right = height.length - 1
  let max = 0
  while (left < right) {
    const area = Math.min(height[left], height[right]) * (right - left)
    max = Math.max(max, area)
    height[left] < height[right] ? left++ : right--
  }
  return max
}
```

## Sliding Window

```typescript
// Minimum Window Substring — O(n + m)
function minWindow(s: string, t: string): string {
  const need = new Map<string, number>()
  for (const c of t) need.set(c, (need.get(c) || 0) + 1)

  let have = 0, required = need.size
  let left = 0, minLen = Infinity, minStart = 0
  const window = new Map<string, number>()

  for (let right = 0; right < s.length; right++) {
    const c = s[right]
    window.set(c, (window.get(c) || 0) + 1)
    if (need.has(c) && window.get(c) === need.get(c)) have++

    while (have === required) {
      if (right - left + 1 < minLen) {
        minLen = right - left + 1
        minStart = left
      }
      const leftChar = s[left]
      window.set(leftChar, window.get(leftChar)! - 1)
      if (need.has(leftChar) && window.get(leftChar)! < need.get(leftChar)!) have--
      left++
    }
  }
  return minLen === Infinity "" : s.slice(minStart, minStart + minLen)
}

// Longest Repeating Character Replacement — O(n)
function characterReplacement(s: string, k: number): number {
  const count = new Map<string, number>()
  let left = 0, maxFreq = 0, maxLen = 0

  for (let right = 0; right < s.length; right++) {
    count.set(s[right], (count.get(s[right]) || 0) + 1)
    maxFreq = Math.max(maxFreq, count.get(s[right])!)
    while (right - left + 1 - maxFreq > k) {
      count.set(s[left], count.get(s[left])! - 1)
      left++
    }
    maxLen = Math.max(maxLen, right - left + 1)
  }
  return maxLen
}
```

## Binary Search

```typescript
// Classic Binary Search — O(log n)
function binarySearch(nums: number[], target: number): number {
  let left = 0, right = nums.length - 1
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2)
    if (nums[mid] === target) return mid
    nums[mid] < target ? left = mid + 1 : right = mid - 1
  }
  return -1
}

// Search in Rotated Sorted Array — O(log n)
function searchRotated(nums: number[], target: number): number {
  let left = 0, right = nums.length - 1
  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2)
    if (nums[mid] === target) return mid

    if (nums[left] <= nums[mid]) {
      // Left half is sorted
      target >= nums[left] && target < nums[mid] ? right = mid - 1 : left = mid + 1
    } else {
      // Right half is sorted
      target > nums[mid] && target <= nums[right] ? left = mid + 1 : right = mid - 1
    }
  }
  return -1
}

// Find Minimum in Rotated Sorted Array — O(log n)
function findMin(nums: number[]): number {
  let left = 0, right = nums.length - 1
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2)
    nums[mid] > nums[right] ? left = mid + 1 : right = mid
  }
  return nums[left]
}
```

## Linked Lists

```typescript
class ListNode {
  val: number
  next: ListNode | null
  constructor(val = 0, next: ListNode | null = null) {
    this.val = val
    this.next = next
  }
}

// Reverse Linked List — O(n)
function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null
  let current = head
  while (current) {
    const next = current.next
    current.next = prev
    prev = current
    current = next
  }
  return prev
}

// Merge Two Sorted Lists — O(n + m)
function mergeTwoLists(l1: ListNode | null, l2: ListNode | null): ListNode | null {
  const dummy = new ListNode(0)
  let current = dummy
  while (l1 && l2) {
    if (l1.val < l2.val) { current.next = l1; l1 = l1.next }
    else { current.next = l2; l2 = l2.next }
    current = current.next
  }
  current.next = l1 || l2
  return dummy.next
}

// Detect Cycle — O(n)
function hasCycle(head: ListNode | null): boolean {
  let slow = head, fast = head
  while (fast?.next) {
    slow = slow!.next
    fast = fast.next.next
    if (slow === fast) return true
  }
  return false
}

// LRU Cache — O(1) get/put
class LRUCache {
  private capacity: number
  private cache = new Map<number, number>()

  constructor(capacity: number) { this.capacity = capacity }

  get(key: number): number {
    if (!this.cache.has(key)) return -1
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  put(key: number, value: number): void {
    if (this.cache.has(key)) this.cache.delete(key)
    this.cache.set(key, value)
    if (this.cache.size > this.capacity) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }
  }
}
```

## Trees

```typescript
class TreeNode {
  val: number
  left: TreeNode | null
  right: TreeNode | null
  constructor(val = 0, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val; this.left = left; this.right = right
  }
}

// Invert Binary Tree — O(n)
function invertTree(root: TreeNode | null): TreeNode | null {
  if (!root) return null
  [root.left, root.right] = [invertTree(root.right), invertTree(root.left)]
  return root
}

// Maximum Depth — O(n)
function maxDepth(root: TreeNode | null): number {
  if (!root) return 0
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right))
}

// Validate BST — O(n)
function isValidBST(root: TreeNode | null): boolean {
  function validate(node: TreeNode | null, min: number, max: number): boolean {
    if (!node) return true
    if (node.val <= min || node.val >= max) return false
    return validate(node.left, min, node.val) && validate(node.right, node.val, max)
  }
  return validate(root, -Infinity, Infinity)
}

// Level Order Traversal — O(n)
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return []
  const result: number[][] = []
  const queue: TreeNode[] = [root]

  while (queue.length) {
    const level: number[] = []
    const size = queue.length
    for (let i = 0; i < size; i++) {
      const node = queue.shift()!
      level.push(node.val)
      if (node.left) queue.push(node.left)
      if (node.right) queue.push(node.right)
    }
    result.push(level)
  }
  return result
}

// Lowest Common Ancestor — O(n)
function lowestCommonAncestor(root: TreeNode, p: TreeNode, q: TreeNode): TreeNode {
  if (p.val < root.val && q.val < root.val) return lowestCommonAncestor(root.left!, p, q)
  if (p.val > root.val && q.val > root.val) return lowestCommonAncestor(root.right!, p, q)
  return root
}
```

## Graphs

```typescript
// Number of Islands — O(m * n)
function numIslands(grid: string[][]): number {
  let count = 0
  const rows = grid.length, cols = grid[0].length

  function dfs(r: number, c: number) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === "0") return
    grid[r][c] = "0"
    dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1)
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "1") { count++; dfs(r, c) }
    }
  }
  return count
}

// Course Schedule (Topological Sort) — O(V + E)
function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const adj = Array.from({ length: numCourses }, () => [] as number[])
  const inDegree = new Array(numCourses).fill(0)

  for (const [course, prereq] of prerequisites) {
    adj[prereq].push(course)
    inDegree[course]++
  }

  const queue: number[] = []
  for (let i = 0; i < numCourses; i++) if (inDegree[i] === 0) queue.push(i)

  let completed = 0
  while (queue.length) {
    const course = queue.shift()!
    completed++
    for (const next of adj[course]) {
      if (--inDegree[next] === 0) queue.push(next)
    }
  }
  return completed === numCourses
}

// Clone Graph — O(V + E)
function cloneGraph(node: _Node | null): _Node | null {
  if (!node) return null
  const map = new Map<_Node, _Node>()

  function dfs(original: _Node): _Node {
    if (map.has(original)) return map.get(original)!
    const clone = new _Node(original.val)
    map.set(original, clone)
    for (const neighbor of original.neighbors) {
      clone.neighbors.push(dfs(neighbor))
    }
    return clone
  }
  return dfs(node)
}
```

## Dynamic Programming

```typescript
// Climbing Stairs — O(n)
function climbStairs(n: number): number {
  if (n <= 2) return n
  let prev = 1, curr = 2
  for (let i = 3; i <= n; i++) {
    [prev, curr] = [curr, prev + curr]
  }
  return curr
}

// Coin Change — O(amount * coins)
function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity)
  dp[0] = 0
  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i) dp[i] = Math.min(dp[i], dp[i - coin] + 1)
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount]
}

// Longest Common Subsequence — O(m * n)
function longestCommonSubsequence(text1: string, text2: string): number {
  const m = text1.length, n = text2.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}

// 0/1 Knapsack — O(n * W)
function knapsack(weights: number[], values: number[], capacity: number): number {
  const n = weights.length
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0))

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weights[i - 1]] + values[i - 1])
      } else {
        dp[i][w] = dp[i - 1][w]
      }
    }
  }
  return dp[n][capacity]
}
```