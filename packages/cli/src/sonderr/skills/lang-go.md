---
name: lang-go
description: Comprehensive Go guide. Covers types, interfaces, goroutines, channels, error handling, testing, and idiomatic Go patterns. Use when writing or reviewing Go code.
---

# Go Mastery

## Types and Interfaces

```go
// Struct with methods
type User struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"created_at"`
}

// Method with pointer receiver (modifies original)
func (u *User) Activate() {
    u.Active = true
}

// Method with value receiver (read-only)
func (u User) DisplayName() string {
    if u.Name == "" {
        return u.Email
    }
    return u.Name
}

// Interface (implicit implementation)
type Repository[T any] interface {
    Get(ctx context.Context, id string) (*T, error)
    List(ctx context.Context, opts ListOpts) ([]T, error)
    Create(ctx context.Context, item *T) error
    Update(ctx context.Context, id string, item *T) error
    Delete(ctx context.Context, id string) error
}

// Empty interface for any type
func PrintValue(v interface{}) {
    fmt.Printf("%v\n", v)
}

// Type assertion
func Process(v interface{}) {
    switch v := v.(type) {
    case string:
        fmt.Println("String:", v)
    case int:
        fmt.Println("Int:", v)
    case error:
        fmt.Println("Error:", v.Error())
    default:
        fmt.Printf("Unknown: %T\n", v)
    }
}
```

## Error Handling

```go
// Error wrapping with context
func GetUser(ctx context.Context, id string) (*User, error) {
    user, err := db.QueryContext(ctx, "SELECT * FROM users WHERE id = $1", id)
    if err != nil {
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    return user, nil
}

// Custom error types
type NotFoundError struct {
    Resource string
    ID       string
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s with id %s not found", e.Resource, e.ID)
}

// Sentinel errors
var (
    ErrNotFound = errors.New("not found")
    ErrConflict = errors.New("conflict")
)

// Error checking with errors.Is and errors.As
func Handle(err error) {
    if errors.Is(err, ErrNotFound) {
        // Handle not found
    }
    var notFound *NotFoundError
    if errors.As(err, &notFound) {
        // Handle specific error type
    }
}

// Must pattern for initialization
func MustDB() *sql.DB {
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        panic(fmt.Sprintf("failed to open db: %v", err))
    }
    return db
}
```

## Goroutines and Channels

```go
// Basic goroutine
go func() {
    fmt.Println("Running in background")
}()

// Channel communication
func producer(ch chan<- int) {
    for i := 0; i < 10; i++ {
        ch <- i
    }
    close(ch)
}

func consumer(ch <-chan int) {
    for v := range ch {
        fmt.Println(v)
    }
}

// Select with timeout
func fetchWithTimeout(url string) (*http.Response, error) {
    ch := make(chan *http.Response, 1)

    go func() {
        resp, _ := http.Get(url)
        ch <- resp
    }()

    select {
    case resp := <-ch:
        return resp, nil
    case <-time.After(5 * time.Second):
        return nil, errors.New("timeout")
    }
}

// Worker pool
func workerPool(jobs <-chan Job, results chan<- Result, numWorkers int) {
    var wg sync.WaitGroup
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                results <- process(job)
            }
        }()
    }
    wg.Wait()
    close(results)
}

// Context cancellation
func fetchWithContext(ctx context.Context, url string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}
```

## Testing

```go
// Table-driven tests
func TestUser_Validate(t *testing.T) {
    tests := []struct {
        name    string
        user    User
        wantErr bool
    }{
        {"valid", User{Name: "Alice", Email: "alice@example.com"}, false},
        {"empty name", User{Name: "", Email: "alice@example.com"}, true},
        {"invalid email", User{Name: "Alice", Email: "not-email"}, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := tt.user.Validate()
            if (err != nil) != tt.wantErr {
                t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}

// Test helpers
func setupTestDB(t *testing.T) *sql.DB {
    t.Helper()
    db, err := sql.Open("sqlite3", ":memory:")
    if err != nil {
        t.Fatalf("failed to open test db: %v", err)
    }
    t.Cleanup(func() { db.Close() })
    return db
}

// Mocking with interfaces
type MockUserRepo struct {
    mock.Mock
}

func (m *MockUserRepo) Get(ctx context.Context, id string) (*User, error) {
    args := m.Called(ctx, id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*User), args.Error(1)
}

// Benchmark
func BenchmarkFibonacci(b *testing.B) {
    for i := 0; i < b.N; i++ {
        fibonacci(20)
    }
}
```

## Project Structure

```
project/
├── cmd/
│   └── myapp/
│       └── main.go
├── internal/
│   ├── handlers/
│   ├── services/
│   ├── repository/
│   └── models/
├── pkg/
│   └── public-api/
├── api/
│   └── openapi.yaml
├── go.mod
├── go.sum
└── Makefile
```

## Idiomatic Go Patterns

```go
// Constructor pattern
func NewUserService(repo Repository[User]) *UserService {
    return &UserService{repo: repo}
}

// Functional options
type ServerOptions struct {
    Port    int
    Timeout time.Duration
}

type ServerOption func(*ServerOptions)

func WithPort(port int) ServerOption {
    return func(o *ServerOptions) { o.Port = port }
}

func WithTimeout(d time.Duration) ServerOption {
    return func(o *ServerOptions) { o.Timeout = d }
}

func NewServer(opts ...ServerOption) *Server {
    options := ServerOptions{
        Port:    8080,
        Timeout: 30 * time.Second,
    }
    for _, opt := range opts {
        opt(&options)
    }
    return &Server{options: options}
}

// Defer for cleanup
func ProcessFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close()

    // Process file...
    return nil
}

// Embedding for composition
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type ReadWriter interface {
    Reader
    Writer
}
```