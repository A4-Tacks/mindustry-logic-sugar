Add some syntax sugar statements to [Mindustry] logic editor

Sugar statements after the write (e.g exit editor), convert to other statements

**Support game version**:

- 135
- 140
- 146..BE-25666
- 147
- 148
- 152

[Mindustry]: https://github.com/Anuken/Mindustry

# Operations
Referring to the source code of `scripts/main.js`,
you can clearly see the expanded statement

# Examples Inside the Game
In the game, it is manifested as the
addition of the `Logic Sugar` statement in the editor

When using this statement,
it will be auto replaced with a normal statement when exiting the editor

> [!TIP]
> Use the 'copy' button to expand multi-line statements (such as `rtbl`)
>
> `rtbl` is a multi variable assignment table created using `@counter`
>
> `rtbl` supports multiple pairs of variables separated by commas

# Examples Outside the Game
```gas
ls ++ i # op add i i 1
ls offset i # op add @counter @counter i
```

# How To Get
Download from Github Actions

1. Go to the Actions page and find the latest successful Action
2. Output zip files in **Artifacts**
