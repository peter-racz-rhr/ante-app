package com.ante.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DotFontTest {
    @Test fun rendersDigitsSideBySide() {
        val rows = DotFont.render("1:0")
        assertEquals(DotFont.ROWS, rows.size)
        assertEquals(5 + 1 + 1 + 1 + 5, rows[0].size)
        assertTrue("the colon's dots", rows[2][6] && rows[4][6] && !rows[3][6])
    }

    @Test fun skipsUnknownCharacters() {
        assertEquals(5, DotFont.render("x7?")[0].size)
        assertEquals(0, DotFont.render("")[0].size)
    }

    @Test fun clockText() {
        assertEquals("1:09", DotFont.clock(4140))
        assertEquals("12:00", DotFont.clock(43_200))
        assertEquals("4:05", DotFont.clock(245))
        assertEquals("0:00", DotFont.clock(-5))
    }
}
