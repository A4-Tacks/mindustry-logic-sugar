Add some syntax sugar statements to [Mindustry] logic editor

Sugar statements after the write (e.g exit editor), convert to other statements

**Support game version**:

- 135
- 140
- 146..BE-25666

[Mindustry]: https://github.com/Anuken/Mindustry

# Operations
Referring to the source code of `scripts/main.js`,
you can clearly see the expanded statement

# Examples
```gas
ls ++ i # op add i i 1
ls offset i # op add @counter @counter i
```

# How To Use
Download from Github Actions

1. Go to the Actions page and find the latest successful Action
2. Output zip files in **Artifacts**
