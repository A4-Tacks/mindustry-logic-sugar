Add some syntax sugar statements to [Mindustry] logic editor

Sugar statements after the write (e.g exit editor), convert to other statements

**Support game version**:

- 135
- 140
- 146..BE-25666

[Mindustry]: https://github.com/Anuken/Mindustry

# Examples
```gas
ls ++ i # op add i i 1
ls offset i # op add @counter @counter i
```
