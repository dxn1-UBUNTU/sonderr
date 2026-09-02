---
name: mobile-development
description: Mobile development patterns for React Native and Flutter. Covers navigation, state management, platform-specific code, performance, and native module integration. Use for building mobile applications.
---

# Mobile Development Mastery

## React Navigation Patterns

```typescript
// Stack Navigator
import { createNativeStackNavigator } from "@react-navigation/native-stack"

const Stack = createNativeStackNavigator<RootStackParamList>()

function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "My App" }} />
      <Stack.Screen name="Details" component={DetailsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ presentation: "modal" }} />
    </Stack.Navigator>
  )
}

// Tab Navigator
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"

const Tab = createBottomTabNavigator()

function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: HomeIcon }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: SettingsIcon }} />
    </Tab.Navigator>
  )
}

// Type-safe navigation
export type RootStackParamList = {
  Home: undefined
  Details: { id: string; title: string }
  Profile: { userId: string } | undefined
}

// Usage with type safety
function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Home">) {
  const goToDetails = () => navigation.navigate("Details", { id: "123", title: "Item" })
}
```

## State Management

```typescript
// Zustand (lightweight)
import { create } from "zustand"

interface AuthState {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: async (email, password) => {
    const user = await authService.login(email, password)
    set({ user })
  },
  logout: () => set({ user: null }),
}))

// Redux Toolkit (complex state)
import { createSlice, configureStore } from "@reduxjs/toolkit"

const authSlice = createSlice({
  name: "auth",
  initialState: { user: null, loading: false, error: null },
  reducers: {
    loginStart: (state) => { state.loading = true },
    loginSuccess: (state, action) => { state.user = action.payload; state.loading = false },
    loginFailure: (state, action) => { state.error = action.payload; state.loading = false },
  },
})
```

## Platform-Specific Code

```typescript
// Platform.select
import { Platform, StyleSheet } from "react-native"

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
      android: { elevation: 4 },
    }),
  },
})

// Platform-specific files
// Button.tsx (fallback)
// Button.ios.tsx (iOS-specific)
// Button.android.tsx (Android-specific)
// React Native auto-resolves based on platform
```

## Performance Optimization

```typescript
// FlatList optimization
<FlatList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  keyExtractor={(item) => item.id}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  initialNumToRender={10}
  maxToRenderPerBatch={5}
  windowSize={5}
  removeClippedSubviews={true}
  updateCellsBatchingPeriod={50}
/>

// Memoize expensive components
const MemoizedCard = React.memo(CardComponent, (prev, next) => {
  return prev.id === next.id && prev.title === next.title
})

// Avoid inline functions
const handlePress = useCallback((id: string) => {
  navigation.navigate("Details", { id })
}, [navigation])

// Image optimization
import FastImage from "react-native-fast-image"

<FastImage
  source={{ uri: imageUrl, priority: FastImage.priority.normal }}
  resizeMode={FastImage.resizeMode.cover}
  cacheControl={FastImage.cacheControl.immutable}
/>
```

## Native Modules

```typescript
// Bridging native code
import { NativeModules, NativeEventEmitter } from "react-native"

const { CalendarModule } = NativeModules
const eventEmitter = new NativeEventEmitter(CalendarModule)

// Create a calendar event
async function createEvent(title: string, date: Date) {
  try {
    await CalendarModule.createEvent(title, date.toISOString())
  } catch (e) {
    console.error("Failed to create event:", e)
  }
}

// Listen to native events
useEffect(() => {
  const subscription = eventEmitter.addListener("EventCreated", (event) => {
    console.log("Event created:", event)
  })
  return () => subscription.remove()
}, [])
```

## Gesture Handling

```typescript
import { GestureDetector, Gesture } from "react-native-gesture-handler"
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated"

function SwipeableCard() {
  const translateX = useSharedValue(0)

  const pan = Gesture.Pan()
    .onUpdate((e) => { translateX.value = e.translationX })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 100) {
        translateX.value = withSpring(e.translationX > 0 ? 300 : -300)
      } else {
        translateX.value = withSpring(0)
      }
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Text>Swipe me</Text>
      </Animated.View>
    </GestureDetector>
  )
}
```