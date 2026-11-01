package com.ante.app.core

/** A 5×7 dot-matrix font for the home-screen widget's clock, so it looks like the app's. */
object DotFont {
    const val ROWS = 7

    private val GLYPHS: Map<Char, List<String>> = mapOf(
        '0' to listOf(".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."),
        '1' to listOf("..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."),
        '2' to listOf(".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"),
        '3' to listOf("####.", "....#", "....#", ".###.", "....#", "....#", "####."),
        '4' to listOf("...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."),
        '5' to listOf("#####", "#....", "####.", "....#", "....#", "#...#", ".###."),
        '6' to listOf("..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."),
        '7' to listOf("#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."),
        '8' to listOf(".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."),
        '9' to listOf(".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."),
        ':' to listOf(".", ".", "#", ".", "#", ".", "."),
    )

    /** Rows of dots for [text]: true where a dot is lit. Unknown characters are skipped; one blank column between glyphs. */
    fun render(text: String): List<BooleanArray> {
        val glyphs = text.mapNotNull { GLYPHS[it] }
        if (glyphs.isEmpty()) return List(ROWS) { BooleanArray(0) }
        val width = glyphs.sumOf { it[0].length } + glyphs.size - 1
        return List(ROWS) { r ->
            val row = BooleanArray(width)
            var x = 0
            glyphs.forEachIndexed { i, g ->
                g[r].forEachIndexed { c, ch -> if (ch == '#') row[x + c] = true }
                x += g[0].length + if (i < glyphs.size - 1) 1 else 0
            }
            row
        }
    }

    /** "h:mm" of [sec], or "m:ss" under an hour, the way the widget shows time left. */
    fun clock(sec: Int): String {
        val s = sec.coerceAtLeast(0)
        return if (s >= 3600) "${s / 3600}:${"%02d".format(s % 3600 / 60)}" else "${s / 60}:${"%02d".format(s % 60)}"
    }
}
