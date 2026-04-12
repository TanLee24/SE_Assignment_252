#!/usr/bin/env perl
# Latexmk configuration for main.tex

# Ensure sufficient passes for complete TOC generation
$max_repeat = 4;

# PDF generation method
$pdf_mode = 1;  # Use pdflatex

# Run pdflatex with critical options
$pdflatex = 'pdflatex -interaction=nonstopmode -file-line-error -shell-escape -synctex=1 -recorder %O %S';

# List of files that trigger recompilation if they change
@dependents = (qw(main.tex sections/phancong.tex sections/prj_description.tex 
                    sections/func_req.tex sections/non_func_req.tex 
                    sections/UI_mockup.tex sections/act_diagram.tex 
                    sections/seq_diagram.tex sections/statechart_diagram.tex 
                    main.toc main.out));

1;
