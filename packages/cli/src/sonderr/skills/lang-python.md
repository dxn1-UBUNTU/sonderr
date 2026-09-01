---
name: lang-python
description: Comprehensive Python guide. Covers types, dataclasses, async, decorators, context managers, generators, packaging, and idiomatic Python patterns. Use when writing or reviewing Python code.
---

# Python Mastery

## Type Hints and Annotations

```python
from typing import Optional, Union, TypeVar, Generic, Protocol
from dataclasses import dataclass

# Basic annotations
def greet(name: str) -> str:
    return f"Hello, {name}"

# Optional and Union
def find_user(user_id: int) -> Optional[User]:
    ...

def process(value: Union[str, int]) -> str:
    ...

# Type aliases
UserId = int
JSON = dict[str, Any]

# Generic functions
T = TypeVar("T")
def first(items: list[T]) -> Optional[T]:
    return items[0] if items else None

# Protocol (structural typing)
class Printable(Protocol):
    def __str__(self) -> str: ...

def print_all(items: list[Printable]) -> None:
    for item in items:
        print(item)
```

## Data Classes and Models

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

class Status(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"

@dataclass
class User:
    id: int
    name: str
    email: str
    status: Status = Status.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    tags: list[str] = field(default_factory=list)

    @property
    def is_active(self) -> bool:
        return self.status == Status.ACTIVE

    def activate(self) -> None:
        self.status = Status.ACTIVE

# Inheritance
@dataclass
class Admin(User):
    permissions: list[str] = field(default_factory=list)

    def has_permission(self, perm: str) -> bool:
        return perm in self.permissions
```

## Async Patterns

```python
import asyncio
from typing import AsyncGenerator

# Basic async
async def fetch_user(user_id: int) -> User:
    async with aiohttp.ClientSession() as session:
        async with session.get(f"/users/{user_id}") as resp:
            data = await resp.json()
            return User(**data)

# Parallel execution
async def fetch_dashboard(user_id: int) -> Dashboard:
    user, posts, notifications = await asyncio.gather(
        fetch_user(user_id),
        fetch_posts(user_id),
        fetch_notifications(user_id),
    )
    return Dashboard(user=user, posts=posts, notifications=notifications)

# Async generators
async def fetch_pages(url: str) -> AsyncGenerator[list[dict], None]:
    while url:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                data = await resp.json()
                yield data["results"]
                url = data.get("next")

# Usage
async def get_all_items(url: str) -> list[dict]:
    items = []
    async for page in fetch_pages(url):
        items.extend(page)
    return items
```

## Decorators

```python
from functools import wraps
from time import perf_counter
from typing import Callable, TypeVar

F = TypeVar("F", bound=Callable)

# Timing decorator
def timed(func: F) -> F:
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = perf_counter()
        result = func(*args, **kwargs)
        elapsed = perf_counter() - start
        print(f"{func.__name__} took {elapsed:.3f}s")
        return result
    return wrapper  # type: ignore

# Retry decorator
def retry(max_attempts: int = 3, delay: float = 1.0):
    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay * (attempt + 1))
        return wrapper  # type: ignore
    return decorator

# Usage
@timed
@retry(max_attempts=3)
def fetch_data(url: str) -> dict:
    ...
```

## Context Managers

```python
from contextlib import contextmanager
from typing import Generator

# Class-based context manager
class DatabaseTransaction:
    def __init__(self, db: Database):
        self.db = db

    def __enter__(self) -> "DatabaseTransaction":
        self.db.begin()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> bool:
        if exc_type is None:
            self.db.commit()
        else:
            self.db.rollback()
        return False

# Function-based context manager
@contextmanager
def managed_resource(name: str) -> Generator[Resource, None, None]:
    resource = acquire_resource(name)
    try:
        yield resource
    finally:
        release_resource(resource)

# Usage
with DatabaseTransaction(db) as tx:
    tx.execute("UPDATE users SET active = true WHERE id = %s", user_id)
```

## Generators and Iterators

```python
from typing import Iterator, Generator

# Generator function
def fibonacci() -> Iterator[int]:
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

# Generator expression
squares = (x**2 for x in range(100))

# Pipeline pattern
def read_lines(path: str) -> Iterator[str]:
    with open(path) as f:
        for line in f:
            yield line.strip()

def parse_records(lines: Iterator[str]) -> Iterator[dict]:
    for line in lines:
        yield json.loads(line)

def filter_active(records: Iterator[dict]) -> Iterator[dict]:
    for record in records:
        if record.get("active"):
            yield record

# Pipeline usage
lines = read_lines("data.jsonl")
records = parse_records(lines)
active = filter_active(records)
```

## Error Handling

```python
# Custom exceptions
class AppError(Exception):
    def __init__(self, message: str, code: str, status_code: int = 500):
        super().__init__(message)
        self.code = code
        self.status_code = status_code

class NotFoundError(AppError):
    def __init__(self, resource: str, id: str):
        super().__init__(
            f"{resource} with id {id} not found",
            "NOT_FOUND",
            404
        )

class ValidationError(AppError):
    def __init__(self, message: str, fields: dict[str, str]):
        super().__init__(message, "VALIDATION_ERROR", 422)
        self.fields = fields

# Usage
def get_user(user_id: int) -> User:
    user = db.users.find(user_id)
    if not user:
        raise NotFoundError("User", str(user_id))
    return user
```

## Packaging and Project Structure

```
project/
├── pyproject.toml        # Modern Python packaging
├── src/
│   └── mypackage/
│       ├── __init__.py
│       ├── models.py
│       ├── services.py
│       └── utils.py
├── tests/
│   ├── conftest.py
│   ├── test_models.py
│   └── test_services.py
└── README.md
```

```toml
# pyproject.toml
[project]
name = "mypackage"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.100",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "ruff>=0.1.0",
    "mypy>=1.0",
]
```

## Pythonic Patterns

```python
# List comprehensions
squares = [x**2 for x in range(10) if x % 2 == 0]

# Dict comprehension
by_id = {user.id: user for user in users}

# Set comprehension
unique_names = {user.name for user in users}

# Walrow operator (Python 3.8+)
if (n := len(data)) > 100:
    print(f"Large dataset: {n} items")

# Structural pattern matching (Python 3.10+)
def handle_command(command: str) -> None:
    match command.split():
        case ["quit"]:
            exit()
        case ["load", filename]:
            load_file(filename)
        case ["save", filename, *options]:
            save_file(filename, options)
        case _:
            print(f"Unknown command: {command}")

# f-strings with formatting
name = "Alice"
age = 30
print(f"{name:>10} is {age:.0f} years old")  # "     Alice is 30 years old"

# Enumerate and indexed iteration
for i, item in enumerate(items, start=1):
    print(f"{i}. {item}")

# Zip for parallel iteration
for name, score in zip(names, scores):
    print(f"{name}: {score}")

# any/all
if any(user.is_admin for user in users):
    print("Has admin users")
```